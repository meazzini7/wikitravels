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
import { sendNotificationEmailByUid } from "../lib/server/notification-email";
import { postToFacebookPage, postToInstagram } from "../lib/server/social-post";
import { getSiteUrl } from "../lib/site-url";
import { destinationMatchKeys } from "../lib/dream-destinations";
import type { UserProfile } from "../lib/types";

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

// imageHint: parole chiave IN INGLESE aggiunte alla ricerca della copertina
// su Unsplash, per evitare foto scollegate dal tema (es. un cucciolo di
// lemure su un articolo di "trekking estremo"): la destinazione da sola
// non basta a garantire coerenza con il tipo di viaggio.
type Vibe = { label: string; imageHint: string };

const VIBES: Vibe[] = [
  { label: "guida segreta", imageHint: "hidden gem secret spot" },
  { label: "viaggio low cost", imageHint: "budget backpacker travel" },
  { label: "itinerario di lusso", imageHint: "luxury travel resort" },
  { label: "nomadi digitali", imageHint: "digital nomad laptop cafe" },
  { label: "per famiglie", imageHint: "family travel kids" },
  { label: "avventura on the road", imageHint: "road trip adventure car" },
  { label: "fuga romantica", imageHint: "romantic couple travel" },
  { label: "viaggio in solitaria", imageHint: "solo traveler" },
  { label: "tour enogastronomico", imageHint: "food wine tasting" },
  { label: "trekking estremo", imageHint: "extreme trekking mountain hiking" },
  { label: "viaggio zaino in spalla", imageHint: "backpacking hiking trail" },
  { label: "luna di miele", imageHint: "honeymoon couple sunset" },
  { label: "ecoturismo", imageHint: "ecotourism nature conservation" },
  { label: "weekend lungo", imageHint: "city weekend getaway" },
  { label: "viaggio spirituale", imageHint: "spiritual temple meditation" },
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
async function generateMetadata(title: string, dest: string, vibe: string, articleExcerpt: string) {
  const prompt = `Sei un esperto di viaggi, SEO e social media. Per il viaggio "${title}" (destinazione: ${dest}, tipo: ${vibe}):
1. Assegna un punteggio da 0 a 10 per ciascuno di questi interessi: ${INTEREST_KEYS.join(", ")}.
2. Scrivi un meta title SEO accattivante, MAX 60 caratteri.
3. Scrivi una meta description SEO persuasiva, MAX 155 caratteri.
4. Scrivi una didascalia BREVE per un post Facebook che invogli a leggere l'articolo su ${dest}: massimo 4-5 frasi brevi, MA formattata per essere leggera da leggere a colpo d'occhio, non un blocco compatto: ogni frase o mini-pensiero va A CAPO con una riga vuota prima del successivo, con qualche emoji pertinente sparsa nel testo (non solo una alla fine) per dare respiro visivo, tono caldo ed entusiasta da vero appassionato di viaggi (non da ufficio marketing), SENZA hashtag e SENZA link (il link viene aggiunto separatamente dal codice, e su Facebook funziona quindi non serve invogliare a cercarlo).
5. Scrivi ANCHE una didascalia LUNGA per Instagram (dove i link non sono cliccabili, quindi deve dare valore già di suo): circa 1200-1600 caratteri, che racconti in modo coinvolgente una parte sostanziosa e concreta del contenuto dell'articolo qui sotto (aneddoti, luoghi, dettagli veri — non solo l'introduzione generica), come un piccolo racconto autonomo. FORMATO (fondamentale, è più importante del contenuto stesso): scrivila come i migliori post di viaggio su Instagram, MAI un blocco di testo fitto. Paragrafi cortissimi, 1-3 frasi ciascuno, separati SEMPRE da una riga vuota. Usa spesso le emoji come piccoli punti di riferimento visivo, per esempio a inizio riga quando introduci un luogo, un'esperienza o un dettaglio (es. "📍 Un luogo:", "🍝 Un sapore:"), non solo 1-2 emoji buttate lì. Deve leggersi comodamente scorrendo veloce col pollice, con lo sguardo che si riposa tra un pensiero e l'altro. SENZA hashtag, SENZA menzionare link o "link in bio" (li aggiunge il codice).
6. Scrivi una lista di 15-20 hashtag pertinenti per Instagram, mescolando hashtag di nicchia (specifici sulla destinazione "${dest}" e sul tema "${vibe}") e hashtag ampi/popolari sul viaggio, per massimizzare la visibilità. Formato: stringa unica con gli hashtag separati da spazio, ciascuno che inizia per # e senza spazi interni.

IMPORTANTE per il formato dei punti 4 e 5: gli a capo e le righe vuote vanno scritti come normali "\n" dentro le stringhe del JSON (JSON valido correttamente escapato), non descritti a parole.

Ecco un estratto del contenuto dell'articolo da cui attingere per i punti 5 e 6:
"""
${articleExcerpt}
"""

Rispondi SOLO con un oggetto JSON puro, senza markdown, con ESATTAMENTE questa struttura:
{"scores": {${INTEREST_KEYS.map((k) => `"${k}": 0`).join(", ")}}, "seo": {"metaTitle": "...", "metaDescription": "..."}, "socialCaption": "...", "instagramCaption": "...", "instagramHashtags": "..."}`;

  const fallback = {
    scores: Object.fromEntries(INTEREST_KEYS.map((k) => [k, 5])),
    seo: { metaTitle: title.slice(0, 60), metaDescription: title.slice(0, 155) },
    socialCaption: `Nuovo articolo su ${dest}! 🌍 Scoprilo sull'Enciclopedia di WikiTravels.`,
    instagramCaption: `Nuovo articolo su ${dest}! 🌍 Scoprilo sull'Enciclopedia di WikiTravels.`,
    instagramHashtags: "#viaggi #travel #wikitravels #viaggiare #turismo #vacanze #wanderlust #travelgram #instatravel #viaggiareitaliani",
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
      socialCaption:
        typeof parsed?.socialCaption === "string" && parsed.socialCaption.trim()
          ? parsed.socialCaption.trim()
          : fallback.socialCaption,
      instagramCaption:
        typeof parsed?.instagramCaption === "string" && parsed.instagramCaption.trim()
          ? parsed.instagramCaption.trim()
          : fallback.instagramCaption,
      instagramHashtags:
        typeof parsed?.instagramHashtags === "string" && parsed.instagramHashtags.trim()
          ? parsed.instagramHashtags.trim()
          : fallback.instagramHashtags,
    };
  } catch (err) {
    console.error("Impossibile generare punteggi/meta SEO/didascalie social, uso i default:", err);
    return fallback;
  }
}

// ------------------------------------------------------------------
// 4. Avvisa chi ha salvato questa destinazione tra le proprie mete dei
//    sogni (lato Admin SDK, non passa dalle regole Firestore lato client).
//    Un fallimento qui non deve mai far fallire la pubblicazione dell'articolo.
// ------------------------------------------------------------------
async function notifyDreamDestinationMatches(destinationName: string, article: { slug: string; title: string }) {
  const key = destinationMatchKeys(destinationName)[0];
  if (!key) return;
  try {
    const snap = await getAdminDb().collection("users").where("dreamDestinationKeys", "array-contains", key).get();
    await Promise.all(
      snap.docs.map(async (d) => {
        const target = d.data() as UserProfile;
        const matched = target.dreamDestinations?.find((dream) =>
          destinationMatchKeys(dream.name, dream.countryCode).includes(key)
        );
        const matchedName = matched?.name ?? destinationName;
        await getAdminDb().collection("users").doc(d.id).collection("notifications").add({
          type: "dream_article",
          fromUid: null,
          fromDisplayName: null,
          fromPhotoURL: null,
          tripId: null,
          tripTitle: null,
          articleSlug: article.slug,
          articleTitle: article.title,
          destinationName: matchedName,
          createdAt: Date.now(),
          read: false,
        });
        await sendNotificationEmailByUid(d.id, {
          type: "dream_article",
          fromUid: null,
          articleSlug: article.slug,
          articleTitle: article.title,
          destinationName: matchedName,
          tripId: null,
          tripTitle: null,
        });
      })
    );
  } catch (err) {
    console.error("Impossibile notificare le mete dei sogni per l'articolo:", err);
  }
}

// ------------------------------------------------------------------
// 5. MAIN
// ------------------------------------------------------------------
export async function generateArticle() {
  const dest = await pickNextDestination();
  const vibe = VIBES[Math.floor(Math.random() * VIBES.length)];
  // internalKey: identificatore prevedibile (destinazione+tema) usato SOLO
  // per slug/URL e anti-duplicati. Il titolo mostrato ai lettori \u00e8 invece
  // scritto dall'AI (vedi masterPrompt sotto) per essere un vero titolo
  // editoriale, vario da un articolo all'altro, non un template ripetitivo.
  const internalKey = `${dest.name}: ${vibe.label}`;
  const slug = internalKey
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = await getAdminDb().collection("articles").doc(slug).get();
  if (existing.exists) {
    console.log(`Slug "${slug}" già esistente, salto questa esecuzione.`);
    return null;
  }

  const masterPrompt = `Agisci come il caporedattore di una rivista di viaggi prestigiosa (pensa al registro di National Geographic Traveller o Condé Nast Traveller), affiancato da uno specialista SEO. Scrivi un articolo enciclopedico ricco, approfondito e coinvolgente sul viaggio "${internalKey}" (Destinazione: ${dest.name}, target/tipo di viaggio: ${vibe.label}).

TITOLO (fondamentale, leggi con attenzione): prima di tutto inventa un titolo editoriale originale per questo pezzo, come lo scriverebbe una vera redazione con decine di firme diverse, ognuna con un proprio stile. NON usare MAI il formato letterale "Destinazione: tema" (es. "Roma: trekking estremo") che è un template, non un titolo. Varia radicalmente la struttura da un articolo all'altro: a volte una domanda, a volte un'affermazione decisa, a volte una frase evocativa o narrativa, a volte un gioco di parole, a volte un numero o una lista imperniata su un dettaglio sorprendente. Il titolo deve comunicare la destinazione e lo spirito del viaggio in modo implicito e originale, mai ripetendo pedissequamente le due etichette. Scrivilo racchiuso ESATTAMENTE così, come primissima riga di output, prima di ogni altra cosa: <title>Il tuo titolo qui</title>

STILE E LESSICO (fondamentale): non scrivere come un generico articolo da blog di viaggi. Usa un lessico ricco, preciso ed evocativo, varia la costruzione delle frasi (alterna frasi brevi e incisive a frasi più ampie e descrittive), e costruisci immagini sensoriali concrete: colori, suoni, profumi, sapori, luce, atmosfera, non solo elenchi di attrazioni. Racconta ogni luogo o esperienza come se il lettore potesse già respirarne l'aria. Evita frasi fatte e aggettivi generici da opuscolo turistico ("bellissimo", "imperdibile", "meraviglioso" usati a vuoto): sostituiscili con dettagli specifici e originali che dimostrino conoscenza reale del posto. Attingi quando pertinente a storia, cultura, tradizioni locali, piccoli aneddoti o curiosità poco note: servono ad ampliare gli argomenti trattati, non solo a descrivere cosa vedere.

PUBBLICO: il pezzo deve parlare a lettori molto diversi tra loro nello stesso articolo, intrecciando naturalmente spunti per ciascuno senza dedicare sezioni separate: chi viaggia in coppia, chi in famiglia con bambini, chi da solo/a, chi cerca lusso e comfort, chi viaggia con budget ridotto, chi cerca adrenalina e chi cerca solo relax o ispirazione culturale. Ogni tipo di viaggiatore deve trovare almeno un dettaglio pensato per lui.

Scrivi in italiano, paragrafi scorrevoli ma sostanziosi, senza ripetizioni.

Dopo il tag <title>, restituisci SOLO HTML puro (nessun markdown, nessun blocco \`\`\`), seguendo ESATTAMENTE questa struttura, in questo ordine, senza aggiungere o togliere sezioni:

<h2>Perché scegliere ${dest.name} per un ${vibe.label}</h2>
<p>Paragrafo introduttivo denso e coinvolgente (10-14 righe): apri con una scena concreta e sensoriale (un momento, un luogo, un dettaglio che catturi l'atmosfera), poi intreccia cenni storici o culturali rilevanti, cosa rende unica la destinazione per questo tipo di viaggio, e perché diversi tipi di viaggiatori vi troverebbero qualcosa di prezioso.</p>

[IMG_LANDMARK: 3-5 parole inglesi del monumento o paesaggio più iconico]

<h2>Quando andare</h2>
<p>Periodo migliore mese per mese o per stagione, clima e cosa aspettarsi (temperature, affluenza turistica, prezzi), eventi, festival o ricorrenze locali da non perdere, con almeno un consiglio su quando evitare la folla.</p>

<h2>Cosa vedere: le tappe imperdibili</h2>
<ul>
<li><b>Nome del luogo:</b> descrizione vivida in 2-4 righe, con un dettaglio storico, architettonico o culturale che vada oltre l'ovvio.</li>
(esattamente 6 voci in totale, ognuna con nome in grassetto e descrizione ricca, variando i tipi di luogo: monumenti, natura, quartieri, panorami, luoghi meno noti)
</ul>

[IMG_ACTIVITY: 3-5 parole inglesi dell'attività o luogo più caratteristico]

<h2>Cosa fare: esperienze da vivere</h2>
<ul>
<li><b>Nome esperienza:</b> descrizione vivida in 2-3 righe.</li>
(esattamente 5 voci in totale, pensate per profili di viaggiatore diversi: un'esperienza adrenalinica, una romantica, una adatta alle famiglie, una culturale/immersiva, una all'insegna del relax)
</ul>

<h2>Dove mangiare: la cucina locale</h2>
<p>Introduzione golosa e culturalmente informata alla cucina locale, incluse le sue radici e influenze (3-5 righe).</p>
<ul>
<li><b>Piatto o specialità:</b> descrizione golosa e sensoriale in 2-3 righe (ingredienti, provenienza, quando/come si mangia tradizionalmente).</li>
(esattamente 4 voci in totale; resta generico su locali/ristoranti specifici, es. "un mercato locale", non inventare nomi propri)
</ul>

[IMG_FOOD: 3-5 parole inglesi di un piatto tipico o mercato locale]

<h2>Dove dormire e come muoversi</h2>
<p>Zone/quartieri consigliati per dormire in base al tipo di viaggio (dal budget al lusso), atmosfera di ciascuna zona, e come muoversi in loco (mezzi pubblici, noleggio, a piedi, app utili, insidie da evitare).</p>

<h2>Budget indicativo</h2>
<table><tr><th>Voce di spesa</th><th>Budget stimato (a persona)</th></tr>
<tr><td>Volo</td><td>...</td></tr>
<tr><td>Alloggio (a notte)</td><td>...</td></tr>
<tr><td>Pasti (al giorno)</td><td>...</td></tr>
<tr><td>Attività/ingressi</td><td>...</td></tr>
<tr><td><b>Totale indicativo (una settimana)</b></td><td><b>...</b></td></tr>
</table>

<div class="secret-spot">💡 <b>IL SEGRETO DEL LOCAL:</b> un consiglio pratico e poco conosciuto, specifico e utile (3-4 righe), quello che solo chi conosce bene il posto potrebbe dare, idealmente qualcosa che non si trova nelle guide standard.</div>

<h2>Un'ultima cosa prima di partire</h2>
<p>Paragrafo di chiusura ispirazionale (5-7 righe), con un tono quasi narrativo, che invita il lettore a immaginarsi già lì e a organizzare questo viaggio.</p>

<p><em>⚠️ Le informazioni su prezzi, orari e periodi indicati sono indicative e possono cambiare: verifica sempre le fonti ufficiali prima di partire.</em></p>`;

  const rawContent = await askGemini(masterPrompt);
  let content = stripCodeFence(rawContent);
  if (content.length < 2000) {
    throw new Error(
      `Contenuto generato troppo corto o vuoto (${content.length} caratteri dopo la pulizia, ${rawContent.length} prima). Anteprima grezza: ${rawContent.slice(0, 300)}`
    );
  }

  // Estrae il titolo editoriale scritto dall'AI (vedi istruzioni <title> nel
  // masterPrompt): se per qualche motivo manca, ripiega sul formato
  // "Destinazione: tema" invece di far fallire l'intera generazione.
  const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || internalKey;
  content = content.replace(/<title>[\s\S]*?<\/title>\s*/i, "");

  // Nonostante l'istruzione di usare SOLO i segnaposto [IMG_...], a volte il
  // modello inventa comunque un proprio tag <img>/<figure> con un src finto
  // (es. "eiffel-tower.jpg"): risultato, un'icona di immagine rotta in
  // pagina. Li rimuoviamo prima di inserire le nostre immagini reali, così
  // l'unico <img> possibile è quello con URL Unsplash valido inserito sotto.
  content = content.replace(/<figure[\s\S]*?<\/figure>/gi, "").replace(/<img[^>]*>/gi, "");

  // Estratto testuale (senza tag HTML né segnaposto immagine) da dare in
  // pasto all'AI come contesto reale per la didascalia lunga di Instagram.
  const plainTextExcerpt = content
    .replace(/\[(IMG_LANDMARK|IMG_ACTIVITY|IMG_FOOD):[^\]]*\]/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  const { scores, seo, socialCaption, instagramCaption, instagramHashtags } = await generateMetadata(
    title,
    dest.name,
    vibe.label,
    plainTextExcerpt
  );

  // Copertina: destinazione + tema del viaggio, per evitare foto generiche
  // scollegate dal tipo di articolo (vedi commento su VIBES sopra).
  const cover = await fetchAndUploadImage(`${dest.keyword} ${vibe.imageHint}`);

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
    vibe: vibe.label,
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

  await notifyDreamDestinationMatches(dest.name, { slug, title });

  // Pubblicazione sui social: un fallimento qui (chiavi non configurate,
  // token scaduto...) non deve mai far fallire la generazione dell'articolo,
  // che a questo punto è già salvato e online. L'esito viene comunque
  // restituito (non solo loggato) così da poterlo controllare direttamente
  // nella risposta JSON del cron, senza dover aprire i log di Vercel.
  const articleUrl = `${getSiteUrl()}/enciclopedia/${slug}`;

  // Instagram taglia le didascalie a 2200 caratteri: corpo + CTA + hashtag
  // devono starci per intero, quindi se serve si accorcia solo il corpo
  // (mai gli hashtag, che sono la parte pensata per la visibilità).
  const instagramCta = "\n\n🔗 Articolo completo nel link in bio";
  const instagramHashtagsBlock = `\n\n${instagramHashtags}`;
  const instagramCaptionBudget = 2200 - instagramCta.length - instagramHashtagsBlock.length;
  const instagramCaptionBody =
    instagramCaption.length > instagramCaptionBudget
      ? `${instagramCaption.slice(0, Math.max(0, instagramCaptionBudget - 1))}…`
      : instagramCaption;
  const fullInstagramCaption = `${instagramCaptionBody}${instagramCta}${instagramHashtagsBlock}`;

  const facebookErrorFallback = { ok: false, error: "Errore imprevisto durante la pubblicazione." };
  const instagramNoCoverResult = { ok: false, error: "Nessuna immagine di copertina disponibile." };
  const [facebook, instagram] = await Promise.all([
    postToFacebookPage({ message: socialCaption, link: articleUrl }).catch((err) => {
      console.error("Post Facebook fallito:", err);
      return facebookErrorFallback;
    }),
    cover
      ? postToInstagram({ imageUrl: cover.url, caption: fullInstagramCaption }).catch((err) => {
          console.error("Post Instagram fallito:", err);
          return facebookErrorFallback;
        })
      : Promise.resolve(instagramNoCoverResult),
  ]);

  console.log(`✅ Articolo pubblicato: ${title} (${slug})`);
  return { title, slug, social: { facebook, instagram } };
}
