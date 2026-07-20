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
// 3. Genera i 6 punteggi interesse (JSON strutturato da Gemini)
// ------------------------------------------------------------------
async function generateScores(title: string, dest: string, vibe: string) {
  const prompt = `Sei un esperto di viaggi. Analizza il viaggio "${title}" (destinazione: ${dest}, tipo: ${vibe}).
Assegna un punteggio da 0 a 10 per: ${INTEREST_KEYS.join(", ")}.
Rispondi SOLO con un oggetto JSON puro, senza markdown, con queste 6 chiavi esatte.`;

  const raw = await askGemini(prompt);
  const clean = raw.replace(/^```json\s*|```\s*$/gim, "").trim();
  try {
    const parsed = JSON.parse(clean);
    const scores: Record<string, number> = {};
    for (const k of INTEREST_KEYS) {
      scores[k] = Math.min(10, Math.max(0, Number(parsed[k] ?? 5)));
    }
    return scores;
  } catch {
    return Object.fromEntries(INTEREST_KEYS.map((k) => [k, 5]));
  }
}

// ------------------------------------------------------------------
// 4. Genera meta title/description SEO
// ------------------------------------------------------------------
async function generateSeoMeta(title: string, dest: string) {
  const prompt = `Scrivi per la pagina "${title}" (viaggio a ${dest}):
1. Un meta title SEO accattivante, MAX 60 caratteri.
2. Una meta description SEO persuasiva, MAX 155 caratteri.
Rispondi in JSON puro: {"metaTitle":"...","metaDescription":"..."}`;
  const raw = await askGemini(prompt);
  const clean = raw.replace(/^```json\s*|```\s*$/gim, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { metaTitle: title.slice(0, 60), metaDescription: title.slice(0, 155) };
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

  const masterPrompt = `Agisci come un esperto Travel Blogger e specialista SEO. Scrivi una guida di viaggio enciclopedica, ottimizzata per Google, su "${title}" (Destinazione: ${dest.name}, Target: ${vibe}).
Tono caloroso, persuasivo, con emoji (✈️🌍🏖️).
Restituisci SOLO HTML puro (no markdown), con questa struttura:
<h2>Introduzione a ${dest.name} per ${vibe}</h2><p>...</p>
[IMG_LANDMARK: 3-5 parole inglesi del landmark principale]
<h2>Cosa vedere e fare</h2><p>...</p>
[IMG_ACTIVITY: 3-5 parole inglesi dell'attività principale]
<h2>Dove mangiare e trappole da evitare</h2><p>...</p>
<table><tr><th>Voce di spesa</th><th>Budget stimato</th></tr>...righe: Voli, Hotel, Pasti, Totale...</table>
<div class="secret-spot">💡 <b>IL SEGRETO DEL LOCAL:</b> ...</div>`;

  let content = await askGemini(masterPrompt);
  content = content.replace(/^```html\s*|```\s*$/gim, "").trim();

  const scores = await generateScores(title, dest.name, vibe);
  const seo = await generateSeoMeta(title, dest.name);

  // Copertina
  const cover = await fetchAndUploadImage(dest.keyword, `articles/${slug}/cover.jpg`);

  // Immagini interne: sostituisce i placeholder [IMG_...] con <figure>
  let imgCount = 0;
  const matches = [...content.matchAll(/\[(IMG_LANDMARK|IMG_ACTIVITY):\s*(.+?)\]/gi)];
  for (const m of matches) {
    imgCount++;
    const keyword = m[2].trim();
    const query = keyword.length < 10 ? `${dest.keyword} ${keyword}` : keyword;
    const img = await fetchAndUploadImage(query, `articles/${slug}/img${imgCount}.jpg`);
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
