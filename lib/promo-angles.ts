// Argomenti che i post promozionali possono trattare, a rotazione: una
// funzionalità del portale, un motivo per iscriversi, un motivo per
// organizzare un viaggio qui invece che altrove. "context" guida il testo
// scritto dall'AI, "imageHint" la foto (in inglese, per la ricerca su
// Unsplash), "linkPath" la pagina del sito più pertinente a cui indirizzare
// chi legge, "label" il nome leggibile mostrato nel pannello admin.
export type PromoAngle = {
  key: string;
  label: string;
  context: string;
  imageHint: string;
  linkPath: string;
};

export const PROMO_ANGLES: PromoAngle[] = [
  {
    key: "enciclopedia",
    label: "Enciclopedia quotidiana",
    context:
      "la sezione Enciclopedia del sito: ogni giorno un nuovo articolo di viaggio scritto in stile rivista patinata, gratis, in italiano, con consigli pratici veri e non i soliti luoghi comuni",
    imageHint: "person reading travel magazine cozy",
    linkPath: "/enciclopedia",
  },
  {
    key: "organizza_viaggio",
    label: "Organizza un viaggio",
    context:
      "come si organizza un viaggio sul portale: itinerario tappa per tappa, punti di interesse, budget stimato, e la possibilità di invitare gli amici a partecipare insieme",
    imageHint: "friends planning trip map table",
    linkPath: "/viaggi/nuovo",
  },
  {
    key: "community_viaggiatori",
    label: "Community di viaggiatori",
    context:
      "la community di viaggiatori del portale: si possono seguire altri utenti, vedere i loro viaggi pubblici, e trovare persone con interessi di viaggio simili ai propri",
    imageHint: "group friends laughing travel",
    linkPath: "/viaggi",
  },
  {
    key: "mete_sogni",
    label: "Mete dei sogni",
    context:
      "la funzione \"mete dei sogni\": si salvano i posti che si sognano di visitare e arriva una notifica automatica ogni volta che esce un nuovo articolo su quella destinazione",
    imageHint: "dreamy sunset travel destination",
    linkPath: "/enciclopedia",
  },
  {
    key: "distintivi",
    label: "Distintivi da sbloccare",
    context:
      "i distintivi da sbloccare via via che si visitano nuovi paesi, nuove città, si percorrono chilometri o si completano viaggi: un modo giocoso di tenere traccia della propria storia da viaggiatore",
    imageHint: "traveler achievement celebration passport stamps",
    linkPath: "/profilo",
  },
  {
    key: "perche_gratis",
    label: "Perché iscriversi (gratis)",
    context:
      "perché vale la pena iscriversi: il portale è completamente gratuito, in italiano, pensato da viaggiatori per viaggiatori, senza pubblicità invadente",
    imageHint: "happy traveler backpack airport",
    linkPath: "/registrati",
  },
  {
    key: "km_insieme",
    label: "Km percorsi insieme",
    context:
      "la funzione che calcola quanti chilometri si sono percorsi insieme a un altro utente nei viaggi condivisi: un modo divertente di ripercorrere la propria storia di viaggi con amici o partner",
    imageHint: "couple friends road trip sunset",
    linkPath: "/viaggi",
  },
  {
    key: "mondo_visitato",
    label: "Mappa del mondo visitato",
    context:
      "la mappa del \"mondo visitato\": il portale colora sulla mappa tutti i paesi già visitati, e mostra anche quanta percentuale del mondo ha visitato l'intera community",
    imageHint: "world map travel pins wanderlust",
    linkPath: "/",
  },
];

// Prefisso della campagna UTM dei post promozionali: Google Analytics
// raggruppa le sessioni per nome campagna, così si vede quale argomento
// porta davvero visitatori (vedi lib/server/performance-insights.ts).
export const PROMO_CAMPAIGN_PREFIX = "promo-";
