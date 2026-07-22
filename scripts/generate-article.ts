/**
 * Genera 1 articolo enciclopedia al giorno.
 * Porting/miglioramento dello script PHP originale:
 * - Rotazione a "tier" (mete popolari -> nicchia) per coprire più keyword nel tempo
 * - Salva su Firestore invece che MySQL
 * - Immagini caricate su Firebase Storage invece che su disco locale
 * - Aggiunge meta title/description SEO generati dall'AI
 *
 * Uso: eseguito da app/api/cron/generate-article/route.ts (Vercel Cron),
 * oppure manualmente con `npm run generate:article`.
 */

import { getAdminDb } from "../lib/firebase-admin";
import { INTEREST_KEYS } from "../lib/interests";
import { askGemini } from "../lib/server/gemini";
import { fetchAndUploadImage } from "../lib/server/fetch-and-upload-image";

// Rimuove un eventuale blocco di codice markdown (```html o ```json) che
// avvolge l'intera risposta. Ancorato solo a inizio/fine dell'intera
// stringa (niente flag "m"): con ^/$ multiline stripperebbe qualsiasi riga
// che inizia/finisce con ```, cancellando di fatto interi paragrafi se il
// contenuto generato contenesse ``` internamente.
function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:html|json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// ------------------------------------------------------------------
// 1. DESTINAZIONI con "tier" — tier 1 = mete più cercate, si esauriscono
//    prima; poi si passa a tier 2, poi tier 3 (nicchia). Copre più
//    long-tail keyword nel tempo invece di ripetere sempre le stesse mete.
// ------------------------------------------------------------------
type Dest = { name: string; keyword: string; tier: 1 | 2 | 3 };

const DESTINATIONS: Dest[] = [
  { name: "Roma", keyword: "Rome Italy colosseum", tier: 1 },
  { name: "Parigi", keyword: "Paris France Eiffel Tower", tier: 1 },
  { name: "Bali", keyword: "Bali Indonesia temple rice", tier: 1 },
  { name: "Tokyo", keyword: "Tokyo Japan cityscape", tier: 1 },
  { name: "New York", keyword: "New York City skyline", tier: 1 },
  { name: "Barcellona", keyword: "Barcelona Spain Sagrada Familia", tier: 1 },
  { name: "Londra", keyword: "London Big Ben Thames", tier: 1 },
  { name: "Praga", keyword: "Prague Czech Republic castle", tier: 2 },
  { name: "Islanda", keyword: "Iceland landscape northern lights", tier: 2 },
  { name: "Sicilia", keyword: "Sicily Italy landscape", tier: 2 },
  { name: "Marrakech", keyword: "Marrakech Morocco medina", tier: 2 },
  { name: "Vietnam", keyword: "Vietnam landscape Ha Long Bay", tier: 2 },
  { name: "Perù", keyword: "Peru Machu Picchu mountains", tier: 2 },
  { name: "Isole Faroe", keyword: "Faroe Islands dramatic cliffs", tier: 3 },
  { name: "Madagascar", keyword: "Madagascar nature wildlife", tier: 3 },
  { name: "Transilvania", keyword: "Transylvania Romania castle", tier: 3 },
  { name: "Lofoten", keyword: "Lofoten Norway fjord", tier: 3 },
  // TODO: incolla qui il resto della lista dal PHP originale, con tier assegnato
];

const VIBES = [
  "guida segreta", "viaggio low cost", "itinerario di lusso", "nomadi digitali",
  "per famiglie", "avventura on the road", "fuga romantica", "viaggio in solitaria",
  "tour enogastronomico", "trekking estremo", "viaggio zaino in spalla",
  "luna di miele", "ecoturismo", "weekend lungo", "viaggio spirituale",
];

// ------------------------------------------------------------------
// 2. Sceglie la prossima destinazione: prima tier 1 non ancora usati
//    di recente, poi tier 2, poi tier 3. Legge da Firestore quali
//    destinazioni sono già state pubblicate.
// ------------------------------------------------------------------
async function pickNextDestination(): Promise<Dest> {
  const publishedSnap = await getAdminDb()
    .collection("articles")
    .select("destination")
    .get();
  const published = new Set(publishedSnap.docs.map((d) => d.data().destination));

  for (const tier of [1, 2, 3] as const) {
    const candidates = DESTINATIONS.filter(
      (d) => d.tier === tier && !published.has(d.name)
    );
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  // Tutte le mete già coperte almeno una volta: ricomincia dal tier 1 random
  const tier1 = DESTINATIONS.filter((d) => d.tier === 1);
  return tier1[Math.floor(Math.random() * tier1.length)];
}

// ------------------------------------------------------------------
// 3. Genera punteggi interesse + meta SEO in UNA sola chiamata Gemini
//    (erano due chiamate separate: unite per consumare meno quota sul
//    piano gratuito). Sono metadati secondari rispetto al contenuto
//    principale: un fallimento qui degrada a valori di default invece di
//    far fallire l'intera generazione.
// ------------------------------------------------------------------
async function generateMetadata(title: string, dest: string, vibe: string) {
  const prompt = `Sei un esperto di viaggi e SEO. Per il viaggio "${title}" (destinazione: ${dest}, tipo: ${vibe}):
1. Assegna un punteggio da 0 a 10 per ciascuno di questi interessi: ${INTEREST_KEYS.join(", ")}.
2. Scrivi un meta title SEO accattivante, MAX 60 caratteri.
3. Scrivi una meta description SEO persuasiva, MAX 155 caratteri.
Rispondi SOLO con un oggetto JSON puro, senza markdown, con ESATTAMENTE questa struttura:
{"scores": {${INTEREST_KEYS.map((k) => `"${k}": 0`).join(", ")}}, "seo": {"metaTitle": "...", "metaDescription": "..."}}`;

  const fallback = {
    scores: Object.fromEntries(INTEREST_KEYS.map((k) => [k, 5])),
    seo: { metaTitle: title.slice(0, 60), metaDescription: title.slice(0, 155) },
  };

  try {
    const raw = await askGemini(prompt, { retryOn429: false });
    const parsed = JSON.parse(stripCodeFence(raw));
    const scores: Record<string, number> = {};
    for (const k of INTEREST_KEYS) {
      scores[k] = Math.min(10, Math.max(0, Number(parsed?.scores?.[k] ?? 5)));
    }
    return {
      scores,
      seo: {
        metaTitle: parsed?.seo?.metaTitle ?? fallback.seo.metaTitle,
        metaDescription: parsed?.seo?.metaDescription ?? fallback.seo.metaDescription,
      },
    };
  } catch (err) {
    console.error("Impossibile generare punteggi/meta SEO, uso i default:", err);
    return fallback;
  }
}

// ------------------------------------------------------------------
// 5. MAIN
// ------------------------------------------------------------------
export async function generateArticle() {
  const dest = await pickNextDestination();
  const vibe = VIBES[Math.floor(Math.random() * VIBES.length)];
  const title = `${dest.name}: ${vibe}`;
  const slug = title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = await getAdminDb().collection("articles").doc(slug).get();
  if (existing.exists) {
    console.log(`Slug "${slug}" già esistente, salto questa esecuzione.`);
    return null;
  }

  const masterPrompt = `Agisci come un travel blogger di fama internazionale e uno specialista SEO. Scrivi un articolo enciclopedico completo, dettagliato e coinvolgente su "${title}" (Destinazione: ${dest.name}, target/tipo di viaggio: ${vibe}).

Tono: caloroso, evocativo, esperto ma amichevole, con qualche emoji pertinente (✈️🌍🏖️🍽️🏨). Scrivi in italiano, frasi scorrevoli, paragrafi brevi (max 4-5 righe), senza ripetizioni.

Restituisci SOLO HTML puro (nessun markdown, nessun blocco \`\`\`), seguendo ESATTAMENTE questa struttura, in questo ordine, senza aggiungere o togliere sezioni:

<h2>Perché scegliere ${dest.name} per un ${vibe}</h2>
<p>Paragrafo introduttivo coinvolgente (5-8 righe): atmosfera, cosa rende unica la destinazione per questo tipo di viaggio.</p>

[IMG_LANDMARK: 3-5 parole inglesi del monumento o paesaggio più iconico]

<h2>Quando andare</h2>
<p>Periodo migliore, clima, eventuali eventi o festival stagionali da non perdere.</p>

<h2>Cosa vedere: le tappe imperdibili</h2>
<ul>
<li><b>Nome del luogo:</b> descrizione in 1-2 righe.</li>
(esattamente 5 voci in totale, ognuna con nome in grassetto e breve descrizione)
</ul>

[IMG_ACTIVITY: 3-5 parole inglesi dell'attività o luogo più caratteristico]

<h2>Cosa fare: esperienze da vivere</h2>
<ul>
<li><b>Nome esperienza:</b> descrizione in 1-2 righe.</li>
(esattamente 4 voci in totale)
</ul>

<h2>Dove mangiare: la cucina locale</h2>
<p>Breve introduzione alla cucina locale (2-3 righe).</p>
<ul>
<li><b>Piatto o specialità:</b> descrizione golosa in 1-2 righe.</li>
(esattamente 3 voci in totale; resta generico su locali/ristoranti specifici, es. "un mercato locale", non inventare nomi propri)
</ul>

[IMG_FOOD: 3-5 parole inglesi di un piatto tipico o mercato locale]

<h2>Dove dormire e come muoversi</h2>
<p>Zone/quartieri consigliati per dormire in base al tipo di viaggio, e come muoversi in loco (mezzi pubblici, noleggio, a piedi...).</p>

<h2>Budget indicativo</h2>
<table><tr><th>Voce di spesa</th><th>Budget stimato (a persona)</th></tr>
<tr><td>Volo</td><td>...</td></tr>
<tr><td>Alloggio (a notte)</td><td>...</td></tr>
<tr><td>Pasti (al giorno)</td><td>...</td></tr>
<tr><td>Attività/ingressi</td><td>...</td></tr>
<tr><td><b>Totale indicativo (una settimana)</b></td><td><b>...</b></td></tr>
</table>

<div class="secret-spot">💡 <b>IL SEGRETO DEL LOCAL:</b> un consiglio pratico e poco conosciuto, specifico e utile (2-3 righe), quello che solo chi conosce bene il posto potrebbe dare.</div>

<h2>Un'ultima cosa prima di partire</h2>
<p>Paragrafo di chiusura ispirazionale (3-4 righe) che invita il lettore a organizzare questo viaggio.</p>

<p><em>⚠️ Le informazioni su prezzi, orari e periodi indicati sono indicative e possono cambiare: verifica sempre le fonti ufficiali prima di partire.</em></p>`;

  const rawContent = await askGemini(masterPrompt);
  let content = stripCodeFence(rawContent);
  if (content.length < 500) {
    throw new Error(
      `Contenuto generato troppo corto o vuoto (${content.length} caratteri dopo la pulizia, ${rawContent.length} prima). Anteprima grezza: ${rawContent.slice(0, 300)}`
    );
  }

  // Nonostante l'istruzione di usare SOLO i segnaposto [IMG_...], a volte il
  // modello inventa comunque un proprio tag <img>/<figure> con un src finto
  // (es. "eiffel-tower.jpg"): risultato, un'icona di immagine rotta in
  // pagina. Li rimuoviamo prima di inserire le nostre immagini reali, così
  // l'unico <img> possibile è quello con URL Unsplash valido inserito sotto.
  content = content.replace(/<figure[\s\S]*?<\/figure>/gi, "").replace(/<img[^>]*>/gi, "");

  const { scores, seo } = await generateMetadata(title, dest.name, vibe);

  // Copertina
  const cover = await fetchAndUploadImage(dest.keyword);

  // Immagini interne: sostituisce i placeholder [IMG_...] con <figure>
  const matches = [...content.matchAll(/\[(IMG_LANDMARK|IMG_ACTIVITY|IMG_FOOD):\s*(.+?)\]/gi)];
  for (const m of matches) {
    const keyword = m[2].trim();
    const query = keyword.length < 10 ? `${dest.keyword} ${keyword}` : keyword;
    const img = await fetchAndUploadImage(query);
    const replacement = img
      ? `<figure><img src="${img.url}" alt="${img.alt}" loading="lazy" />
         <figcaption>Foto di <a href="${img.link}" target="_blank">${img.author}</a> su Unsplash</figcaption></figure>`
      : "";
    content = content.replace(m[0], replacement);
  }

  await getAdminDb().collection("articles").doc(slug).set({
    title,
    slug,
    destination: dest.name,
    vibe,
    contentHtml: content,
    coverImageUrl: cover?.url ?? null,
    coverImageCredit: cover ? { author: cover.author, link: cover.link } : null,
    scores,
    tier: dest.tier,
    seo,
    status: "published",
    views: 0,
    createdAt: new Date(),
  });

  console.log(`✅ Articolo pubblicato: ${title} (${slug})`);
  return { title, slug };
}
