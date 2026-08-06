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

// ------------------------------------------------------------------
// Argomenti che il post può trattare, a rotazione: una funzionalità del
// portale, un motivo per iscriversi, un motivo per organizzare un viaggio
// qui invece che altrove. "context" guida il testo scritto dall'AI,
// "imageHint" la foto (in inglese, per la ricerca su Unsplash), "linkPath"
// la pagina del sito più pertinente a cui indirizzare chi legge.
// ------------------------------------------------------------------
type Angle = { key: string; context: string; imageHint: string; linkPath: string };

const ANGLES: Angle[] = [
  {
    key: "enciclopedia",
    context:
      "la sezione Enciclopedia del sito: ogni giorno un nuovo articolo di viaggio scritto in stile rivista patinata, gratis, in italiano, con consigli pratici veri e non i soliti luoghi comuni",
    imageHint: "person reading travel magazine cozy",
    linkPath: "/enciclopedia",
  },
  {
    key: "organizza_viaggio",
    context:
      "come si organizza un viaggio sul portale: itinerario tappa per tappa, punti di interesse, budget stimato, e la possibilità di invitare gli amici a partecipare insieme",
    imageHint: "friends planning trip map table",
    linkPath: "/viaggi/nuovo",
  },
  {
    key: "community_viaggiatori",
    context:
      "la community di viaggiatori del portale: si possono seguire altri utenti, vedere i loro viaggi pubblici, e trovare persone con interessi di viaggio simili ai propri",
    imageHint: "group friends laughing travel",
    linkPath: "/viaggi",
  },
  {
    key: "mete_sogni",
    context:
      "la funzione \"mete dei sogni\": si salvano i posti che si sognano di visitare e arriva una notifica automatica ogni volta che esce un nuovo articolo su quella destinazione",
    imageHint: "dreamy sunset travel destination",
    linkPath: "/enciclopedia",
  },
  {
    key: "distintivi",
    context:
      "i distintivi da sbloccare via via che si visitano nuovi paesi, nuove città, si percorrono chilometri o si completano viaggi: un modo giocoso di tenere traccia della propria storia da viaggiatore",
    imageHint: "traveler achievement celebration passport stamps",
    linkPath: "/profilo",
  },
  {
    key: "perche_gratis",
    context:
      "perché vale la pena iscriversi: il portale è completamente gratuito, in italiano, pensato da viaggiatori per viaggiatori, senza pubblicità invadente",
    imageHint: "happy traveler backpack airport",
    linkPath: "/registrati",
  },
  {
    key: "km_insieme",
    context:
      "la funzione che calcola quanti chilometri si sono percorsi insieme a un altro utente nei viaggi condivisi: un modo divertente di ripercorrere la propria storia di viaggi con amici o partner",
    imageHint: "couple friends road trip sunset",
    linkPath: "/viaggi",
  },
  {
    key: "mondo_visitato",
    context:
      "la mappa del \"mondo visitato\": il portale colora sulla mappa tutti i paesi già visitati, e mostra anche quanta percentuale del mondo ha visitato l'intera community",
    imageHint: "world map travel pins wanderlust",
    linkPath: "/",
  },
];

// Evita di ripetere lo stesso argomento del giorno prima: legge l'ultimo
// usato da Firestore ed esclude solo quello dalla scelta random.
async function pickNextAngle(): Promise<Angle> {
  const lastSnap = await getAdminDb().collection("promoPosts").orderBy("createdAt", "desc").limit(1).get();
  const lastAngleKey = lastSnap.docs[0]?.data().angle as string | undefined;
  const candidates = ANGLES.filter((a) => a.key !== lastAngleKey);
  const pool = candidates.length > 0 ? candidates : ANGLES;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function writeCaption(angle: Angle): Promise<string> {
  const prompt = `Sei un vero appassionato di viaggi che gestisce i canali social di WikiTravels, un portale italiano gratuito per organizzare viaggi e leggere guide di viaggio scritte in stile rivista. Scrivi un post per Facebook e Instagram nel tono di un amico che ogni tanto racconta perché ama questo posto — non un ufficio marketing, niente frasi fatte da pubblicità.

L'argomento di oggi è: ${angle.context}.

Il post deve: invogliare chi legge a scoprire/provare questa cosa sul portale, essere breve (massimo 5-6 frasi brevi), avere un tono caldo, autentico ed entusiasta, usare al massimo 1-2 emoji pertinenti senza esagerare. NON usare hashtag. NON usare markdown. NON includere link (viene aggiunto separatamente dal codice). Scrivi in italiano. Rispondi SOLO con il testo del post, niente altro.`;

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
  const angle = await pickNextAngle();
  const caption = await writeCaption(angle);
  const link = `${getSiteUrl()}${angle.linkPath}`;
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
