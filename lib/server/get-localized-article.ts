import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getAdminDb } from "../firebase-admin";
import { translateArticleContent } from "./translate-article";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";
import type { Article } from "../types";

export interface LocalizedArticle extends Article {
  displayTitle: string;
  displayContentHtml: string;
  displayMetaTitle: string;
  displayMetaDescription: string;
  isMachineTranslated: boolean;
}

function withOriginal(article: Article): LocalizedArticle {
  return {
    ...article,
    displayTitle: article.title,
    displayContentHtml: article.contentHtml,
    displayMetaTitle: article.seo?.metaTitle ?? article.title,
    displayMetaDescription: article.seo?.metaDescription ?? "",
    isMachineTranslated: false,
  };
}

function tsToIso(value: unknown): string | undefined {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

// Documento articolo in italiano (la lingua di default, quella di quasi tutto
// il traffico) nella Data Cache di Next: la pagina e' dinamica perche' legge
// il cookie lingua, ma almeno non rilegge da Firestore (e non rideserializza
// tutto il contentHtml) a ogni singola visita. Invalidata dal cron alla
// pubblicazione (tag "articles"). Per le altre lingue si legge sempre il
// documento fresco: la traduzione viene scritta al volo e non deve risultare
// "mancante" a causa di una copia in cache.
const getCachedArticleDoc = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const snap = await getAdminDb().collection("articles").doc(slug).get();
    if (!snap.exists) return null;
    const data = snap.data() as Article;
    // I Timestamp non sopravvivono alla serializzazione della cache: li
    // convertiamo in stringa ISO (la pagina la gestisce).
    return { ...data, createdAt: tsToIso(data.createdAt) ?? data.createdAt };
  },
  ["article-doc-v1"],
  { revalidate: 43200, tags: ["articles"] }
);

// cache(): dedupe entro la stessa richiesta HTTP. generateMetadata() e il
// componente della pagina chiedono entrambi lo stesso slug+lingua: senza
// questo, tradurrebbero due volte lo stesso articolo (doppio costo Gemini).
export const getLocalizedArticle = cache(async function getLocalizedArticle(
  slug: string,
  locale: Locale
): Promise<LocalizedArticle | null> {
  if (locale === DEFAULT_LOCALE) {
    const cachedArticle = await getCachedArticleDoc(slug);
    return cachedArticle ? withOriginal(cachedArticle) : null;
  }

  const ref = getAdminDb().collection("articles").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const article = snap.data() as Article;

  const cached = article.translations?.[locale];
  if (cached) {
    return {
      ...article,
      displayTitle: cached.title,
      displayContentHtml: cached.contentHtml,
      displayMetaTitle: cached.metaTitle,
      displayMetaDescription: cached.metaDescription,
      isMachineTranslated: true,
    };
  }

  try {
    const translated = await translateArticleContent(
      {
        title: article.title,
        contentHtml: article.contentHtml,
        metaTitle: article.seo?.metaTitle ?? article.title,
        metaDescription: article.seo?.metaDescription ?? "",
      },
      locale
    );
    // Fire-and-forget: se il salvataggio fallisce, il prossimo visitatore
    // in questa lingua ritraduce, non blocchiamo la risposta per questo.
    ref
      .update({ [`translations.${locale}`]: translated })
      .catch((err) => console.error(`Impossibile salvare la traduzione (${locale}) di ${slug}:`, err));
    return {
      ...article,
      displayTitle: translated.title,
      displayContentHtml: translated.contentHtml,
      displayMetaTitle: translated.metaTitle,
      displayMetaDescription: translated.metaDescription,
      isMachineTranslated: true,
    };
  } catch (err) {
    console.error(`Impossibile tradurre l'articolo ${slug} in ${locale}, mostro l'italiano:`, err);
    return withOriginal(article);
  }
});
