/**
 * Genera 1 post promozionale al giorno per Facebook e Instagram (NON per
 * il sito): niente articolo, niente pagina su /enciclopedia. Serve a
 * spiegare via via, con un tono da amico e non da ufficio marketing, le
 * varie funzionalità del portale per invogliare le persone a iscriversi.
 *
 * Uso: eseguito da app/api/cron/generate-promo-post/route.ts (Vercel Cron),
 * oppure manualmente con `npm run generate:promo-post`.
 */

import { getAdminDb } from "../lib/firebase-admin";
import { askGemini } from "../lib/server/gemini";
import { fetchAndUploadImage } from "../lib/server/fetch-and-upload-image";
import { postToFacebookPage, postToInstagram } from "../lib/server/social-post";
import { getSiteUrl } from "../lib/site-url";
import { withUtm } from "../lib/utm";
import { PROMO_ANGLES, PROMO_CAMPAIGN_PREFIX, type PromoAngle } from "../lib/promo-angles";
import {
  getLearningInsights,
  pickWeighted,
  shouldExplore,
  weightFor,
  type Insights,
} from "../lib/server/performance-insights";

// Evita di ripetere lo stesso argomento del giorno prima: legge l'ultimo
// usato da Firestore ed esclude solo quello dalla scelta. Se i dati di
// traffico sono abbastanza, gli argomenti che portano più visitatori hanno
// più probabilità di uscire (con una quota di esplorazione sempre attiva).
async function pickNextAngle(insights: Insights | null): Promise<PromoAngle> {
  const lastSnap = await getAdminDb().collection("promoPosts").orderBy("createdAt", "desc").limit(1).get();
  const lastAngleKey = lastSnap.docs[0]?.data().angle as string | undefined;
  const candidates = PROMO_ANGLES.filter((a) => a.key !== lastAngleKey);
  const pool = candidates.length > 0 ? candidates : PROMO_ANGLES;
  if (!insights || shouldExplore()) return pool[Math.floor(Math.random() * pool.length)];
  return pickWeighted(pool, (a) => weightFor(insights.promoAngles, a.key));
}

async function writeCaption(angle: PromoAngle): Promise<string> {
  const prompt = `Sei un vero appassionato di viaggi che gestisce i canali social di WikiTravels, un portale italiano gratuito per organizzare viaggi e leggere guide di viaggio scritte in stile rivista. Scrivi un post per Facebook e Instagram nel tono di un amico che ogni tanto racconta perché ama questo posto — non un ufficio marketing, niente frasi fatte da pubblicità.

L'argomento di oggi è: ${angle.context}.

Il post deve: invogliare chi legge a scoprire/provare questa cosa sul portale, essere breve (massimo 5-6 frasi brevi), avere un tono caldo, autentico ed entusiasta.

FORMATO (fondamentale, come i migliori post di viaggio su Instagram/Facebook, mai un blocco di testo fitto): paragrafi cortissimi, 1-2 frasi ciascuno, SEMPRE separati da una riga vuota (vero a capo "\n\n", non descritto a parole). Usa qualche emoji pertinente sparsa nel testo come punto di riferimento visivo, non solo una alla fine, senza esagerare. Deve leggersi comodamente scorrendo veloce col pollice.

NON usare hashtag. NON usare markdown. NON includere link (viene aggiunto separatamente dal codice). Scrivi in italiano. Rispondi SOLO con il testo del post, niente altro.`;

  const fallback = "Oggi vi racconto una cosa di WikiTravels che mi piace tantissimo... scopritela anche voi! 🌍";

  try {
    const raw = await askGemini(prompt, { retryOn429: false });
    const text = raw.trim();
    return text.length > 0 ? text : fallback;
  } catch (err) {
    console.error("Impossibile generare la didascalia del post promozionale, uso il default:", err);
    return fallback;
  }
}

export async function generatePromoPost() {
  const insights = await getLearningInsights();
  const angle = await pickNextAngle(insights);
  const caption = await writeCaption(angle);
  // Campagna UTM per argomento: Google Analytics mostra poi quante visite
  // ha portato ciascuno (letto da lib/server/performance-insights.ts).
  const link = withUtm(`${getSiteUrl()}${angle.linkPath}`, `${PROMO_CAMPAIGN_PREFIX}${angle.key}`);
  const cover = await fetchAndUploadImage(angle.imageHint);

  const [facebook, instagram] = await Promise.all([
    postToFacebookPage({ message: caption, link }).catch((err) => {
      console.error("Post promozionale Facebook fallito:", err);
      return { ok: false, error: "Errore imprevisto durante la pubblicazione." };
    }),
    cover
      ? postToInstagram({ imageUrl: cover.url, caption: `${caption}\n\n🔗 Link in bio` }).catch((err) => {
          console.error("Post promozionale Instagram fallito:", err);
          return { ok: false, error: "Errore imprevisto durante la pubblicazione." };
        })
      : Promise.resolve({ ok: false, error: "Nessuna immagine disponibile." }),
  ]);

  // Solo per tracciare l'ultimo argomento usato (anti-ripetizione) e avere
  // uno storico: NON è un articolo, non appare da nessuna parte sul sito.
  await getAdminDb().collection("promoPosts").add({
    angle: angle.key,
    caption,
    link,
    social: { facebook, instagram },
    createdAt: new Date(),
  });

  console.log(`✅ Post promozionale pubblicato (argomento: ${angle.key})`);
  return { angle: angle.key, social: { facebook, instagram } };
}
