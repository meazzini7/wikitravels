/**
 * Riscrive gli articoli pubblicati prima del nuovo generatore (quelli senza
 * il campo `layout`), uno per volta, con le stesse regole dei nuovi: niente
 * finta esperienza, struttura varia, sezioni pratiche, controllo di qualità.
 *
 * Cosa resta uguale: indirizzo (slug), data di pubblicazione, visite,
 * copertina e foto già presenti nel testo (così non si consumano chiamate a
 * Unsplash). Cosa cambia: titolo, testo, meta SEO, punteggi di interesse.
 * Le traduzioni salvate vengono cancellate, altrimenti mostrerebbero ancora
 * il testo vecchio.
 *
 * Uso: da app/api/admin/rewrite-article/route.ts (pagina /admin/riscrivi).
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../lib/firebase-admin";
import { fetchAndUploadImage } from "../lib/server/fetch-and-upload-image";
import { getLearningInsights } from "../lib/server/performance-insights";
import { generateMetadata, writeArticleContent } from "./generate-article";

// Dopo questi tentativi falliti un articolo viene lasciato com'è (e non più
// riprovato), per non girare all'infinito su un caso che non riesce.
export const MAX_REWRITE_ATTEMPTS = 3;

type Candidate = { slug: string; createdAt: number; attempts: number };

function toMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return typeof value === "number" ? value : 0;
}

// Articoli ancora da rinnovare, dal più vecchio. Si leggono solo i pochi
// campi che servono a decidere.
async function listCandidates(): Promise<Candidate[]> {
  const snap = await getAdminDb()
    .collection("articles")
    .where("status", "==", "published")
    .select("layout", "createdAt", "rewriteAttempts")
    .get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        slug: d.id,
        hasLayout: typeof data.layout === "string" && data.layout.length > 0,
        createdAt: toMillis(data.createdAt),
        attempts: typeof data.rewriteAttempts === "number" ? data.rewriteAttempts : 0,
      };
    })
    .filter((a) => !a.hasLayout && a.attempts < MAX_REWRITE_ATTEMPTS)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(({ slug, createdAt, attempts }) => ({ slug, createdAt, attempts }));
}

export async function countArticlesToRewrite(): Promise<number> {
  return (await listCandidates()).length;
}

export type RewriteResult = {
  ok: boolean;
  remaining: number;
  slug?: string;
  title?: string;
  error?: string;
};

export async function rewriteNextOldArticle(): Promise<RewriteResult> {
  const candidates = await listCandidates();
  if (candidates.length === 0) return { ok: true, remaining: 0 };

  const { slug } = candidates[0];
  const ref = getAdminDb().collection("articles").doc(slug);
  const snap = await ref.get();
  const old = snap.data() as {
    destination: string;
    vibe: string;
    contentHtml: string;
    coverImageUrl?: string | null;
    scores?: Record<string, number>;
    rewriteAttempts?: number;
  };

  try {
    const insights = await getLearningInsights();
    const { title, content, layout, aiModel } = await writeArticleContent({
      destName: old.destination,
      vibeLabel: old.vibe,
      insights,
    });

    // Come nel generatore: via eventuali <img>/<figure> inventati dal modello.
    let html = content.replace(/<figure[\s\S]*?<\/figure>/gi, "").replace(/<img[^>]*>/gi, "");

    // Estratto per la meta SEO/punteggi (stessa logica del generatore).
    const excerpt = html
      .replace(/\[(IMG_LANDMARK|IMG_ACTIVITY|IMG_FOOD):[^\]]*\]/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
    const meta = await generateMetadata(title, old.destination, old.vibe, excerpt);
    // generateMetadata ripiega su tutti 5 se l'AI non risponde: in quel caso
    // meglio tenere i punteggi che l'articolo aveva già.
    const scoresLookDefault = Object.values(meta.scores).every((v) => v === 5);
    const scores = scoresLookDefault && old.scores ? old.scores : meta.scores;

    // Foto: si riusano quelle già presenti nel vecchio testo, nell'ordine.
    // Solo se mancano se ne cercano di nuove.
    const oldFigures = old.contentHtml?.match(/<figure[\s\S]*?<\/figure>/gi) ?? [];
    let figureIndex = 0;
    const placeholders = [...html.matchAll(/\[(IMG_LANDMARK|IMG_ACTIVITY|IMG_FOOD):\s*(.+?)\]/gi)];
    for (const m of placeholders) {
      let replacement = oldFigures[figureIndex++] ?? "";
      if (!replacement) {
        const keyword = m[2].trim();
        const img = await fetchAndUploadImage(keyword.length < 10 ? `${old.destination} ${keyword}` : keyword);
        if (img) {
          replacement = `<figure><img src="${img.url}" alt="${img.alt}" loading="lazy" />
         <figcaption>Foto di <a href="${img.link}" target="_blank">${img.author}</a> su Unsplash</figcaption></figure>`;
        }
      }
      html = html.replace(m[0], replacement);
    }

    await ref.update({
      title,
      contentHtml: html,
      seo: meta.seo,
      scores,
      layout,
      aiModel,
      rewrittenAt: new Date(),
      rewriteError: FieldValue.delete(),
      translations: FieldValue.delete(),
    });

    return { ok: true, remaining: candidates.length - 1, slug, title };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Riscrittura di ${slug} fallita:`, err);
    await ref
      .update({ rewriteAttempts: (old.rewriteAttempts ?? 0) + 1, rewriteError: message.slice(0, 500) })
      .catch((e) => console.error("Impossibile registrare il tentativo fallito:", e));
    const stillTrying = (old.rewriteAttempts ?? 0) + 1 < MAX_REWRITE_ATTEMPTS;
    return {
      ok: false,
      remaining: candidates.length - (stillTrying ? 0 : 1),
      slug,
      error: message,
    };
  }
}
