// Strutture e controlli di qualità per gli articoli generati.
//
// Perché esiste: se ogni articolo ha le stesse sezioni nello stesso ordine e
// racconta esperienze mai vissute, il sito sembra "contenuto prodotto in
// serie" (motivo tipico di rifiuto di AdSense). Qui ci sono 4 strutture
// diverse tra cui scegliere a caso, i blocchi utili comuni a tutte (con
// informazioni pratiche per chi parte dall'Italia) e i controlli che
// scartano un testo se è corto o se finge di essere stato sul posto.

export type ArticleLayout = {
  key: string;
  // Sezioni "centrali" che cambiano da una struttura all'altra.
  skeleton: (dest: string, vibe: string) => string;
};

const INTRO = (dest: string, vibe: string) => `<h2>Perché scegliere ${dest} per un ${vibe}</h2>
<p>Paragrafo introduttivo denso (8-12 righe): apri con una scena o un dettaglio concreto e sensoriale della destinazione, poi spiega con fatti reali (storia, geografia, cultura) cosa la rende speciale per questo tipo di viaggio e per quali viaggiatori ha più senso.</p>

[IMG_LANDMARK: 3-5 parole inglesi del monumento o paesaggio più iconico]`;

const WHEN = `<h2>Quando andare</h2>
<p>Periodo migliore per stagione o per mese, clima atteso (temperature indicative), affluenza turistica e prezzi nei vari periodi, eventi o festival reali e noti, e quando evitare la folla.</p>`;

const FOOD_INTRO = `<h2>A tavola: la cucina locale</h2>
<p>Introduzione alla cucina del posto con radici e influenze (3-5 righe).</p>
<ul>
<li><b>Piatto o specialità tradizionale:</b> ingredienti, origine, quando e come si mangia (2-3 righe).</li>
(esattamente 4 voci; solo piatti tradizionali realmente esistenti; nessun nome di ristorante)
</ul>

[IMG_FOOD: 3-5 parole inglesi di un piatto tipico o mercato locale]`;

const STAY_MOVE = `<h2>Dove dormire e come muoversi</h2>
<p>Zone o quartieri reali consigliati per dormire in base al tipo di viaggio (budget, comfort, lusso) con il carattere di ciascuna, e come spostarsi in loco (mezzi pubblici, noleggio, a piedi, app utili, insidie). Nessun nome di hotel.</p>`;

const COMMON_TAIL = `<h2>Budget indicativo</h2>
<p>Stime di ordine di grandezza in euro a persona, da prendere come punto di partenza e non come preventivo.</p>
<table><tr><th>Voce di spesa</th><th>Stima (a persona)</th></tr>
<tr><td>Volo dall'Italia (andata e ritorno)</td><td>intervallo realistico, "circa"</td></tr>
<tr><td>Alloggio (a notte)</td><td>intervallo realistico, "circa"</td></tr>
<tr><td>Pasti (al giorno)</td><td>intervallo realistico, "circa"</td></tr>
<tr><td>Attività e ingressi</td><td>intervallo realistico, "circa"</td></tr>
<tr><td><b>Totale indicativo (una settimana)</b></td><td><b>intervallo, "circa"</b></td></tr>
</table>

<h2>Informazioni pratiche per chi parte dall'Italia</h2>
<ul>
<li><b>Documenti:</b> indica in termini generali cosa serve a un cittadino italiano (carta d'identità o passaporto, eventuale visto o autorizzazione di viaggio) e rimanda a una verifica sui requisiti aggiornati; se non sei certo, non affermare nulla.</li>
<li><b>Moneta e pagamenti:</b> valuta locale, quanto è diffusa la carta, se conviene avere contanti.</li>
<li><b>Fuso orario:</b> differenza indicativa rispetto all'Italia.</li>
<li><b>Lingua:</b> lingua ufficiale e quanto si cavano d'impaccio gli stranieri con l'inglese.</li>
<li><b>Presa elettrica:</b> tipo di presa e voltaggio; serve un adattatore?</li>
<li><b>Come arrivare:</b> aeroporto principale e durata indicativa del volo dall'Italia, con o senza scalo.</li>
</ul>

<h2>Errori da evitare</h2>
<ul>
<li><b>Errore comune:</b> perché è un errore e cosa fare invece (1-2 righe).</li>
(esattamente 4 voci, errori davvero tipici per questa destinazione e questo tipo di viaggio)
</ul>

<h2>Domande frequenti</h2>
<h3>Domanda che chi pianifica questo viaggio si pone davvero (es. quanti giorni servono, quando conviene andare, se è adatta a chi viaggia da solo o con bambini)?</h3>
<p>Risposta diretta e utile in 2-4 righe.</p>
(esattamente 4 coppie domanda/risposta, tutte diverse dalle sezioni precedenti, ciascuna con <h3> e <p>)

<div class="secret-spot">💡 <b>UN CONSIGLIO PRATICO:</b> un suggerimento concreto e davvero utile per organizzare meglio il viaggio (3-4 righe), basato su fatti noti e non su presunte conoscenze da insider.</div>

<h2>Prima di partire</h2>
<p>Paragrafo di chiusura sobrio (4-6 righe) che aiuta a decidere: a chi consigliamo questo viaggio e quale primo passo concreto fare per organizzarlo.</p>`;

export const ARTICLE_LAYOUTS: ArticleLayout[] = [
  {
    key: "zone",
    skeleton: (dest, vibe) => `${INTRO(dest, vibe)}

${WHEN}

<h2>Le zone da conoscere</h2>
<p>Breve introduzione su come è organizzata la destinazione (2-3 righe).</p>
<h3>Nome reale di una zona, quartiere o area</h3>
<p>Carattere della zona, cosa vedere, per quale viaggiatore è adatta (4-6 righe).</p>
(esattamente 4 zone/aree reali, ciascuna con <h3> e <p>)

[IMG_ACTIVITY: 3-5 parole inglesi dell'attività o luogo più caratteristico]

<h2>Cosa fare: esperienze da vivere</h2>
<ul>
<li><b>Nome esperienza:</b> descrizione in 2-3 righe, con indicazioni pratiche.</li>
(esattamente 5 voci per profili diversi: adrenalina, romantica, per famiglie, culturale, relax)
</ul>

${FOOD_INTRO}

${STAY_MOVE}

${COMMON_TAIL}`,
  },
  {
    key: "itinerario",
    skeleton: (dest, vibe) => `${INTRO(dest, vibe)}

${WHEN}

<h2>Itinerario di 3 giorni</h2>
<p>Una riga su come è pensato (spostamenti razionali, tappe vicine tra loro).</p>
<h3>Giorno 1: titolo del giorno</h3>
<p>Mattina, pomeriggio e sera con luoghi reali e spostamenti sensati (5-7 righe).</p>
(esattamente 3 giorni, ciascuno con <h3> e <p>)

[IMG_ACTIVITY: 3-5 parole inglesi dell'attività o luogo più caratteristico]

<h2>Se hai un giorno in più</h2>
<ul>
<li><b>Gita o esperienza extra:</b> cosa è, come arrivarci, quanto tempo serve (2-3 righe).</li>
(esattamente 3 voci)
</ul>

${FOOD_INTRO}

${STAY_MOVE}

${COMMON_TAIL}`,
  },
  {
    key: "meta-giusta",
    skeleton: (dest, vibe) => `${INTRO(dest, vibe)}

<h2>È la meta giusta per te?</h2>
<p><b>Ti piacerà se...</b></p>
<ul>
<li>motivo concreto (1 riga)</li>
(esattamente 4 voci)
</ul>
<p><b>Forse non fa per te se...</b></p>
<ul>
<li>limite onesto (1 riga)</li>
(esattamente 3 voci: sii sincero sui lati meno comodi, come caldo, folla, costi, distanze)
</ul>

${WHEN}

<h2>Cosa vedere: le tappe principali</h2>
<ul>
<li><b>Nome reale del luogo:</b> descrizione in 2-4 righe con un dettaglio storico o culturale che vada oltre l'ovvio.</li>
(esattamente 6 voci, tipi diversi: monumenti, natura, quartieri, panorami)
</ul>

[IMG_ACTIVITY: 3-5 parole inglesi dell'attività o luogo più caratteristico]

${FOOD_INTRO}

${STAY_MOVE}

${COMMON_TAIL}`,
  },
  {
    key: "contesto",
    skeleton: (dest, vibe) => `${INTRO(dest, vibe)}

<h2>Storia e cultura in breve</h2>
<p>Tre paragrafi brevi su fatti realmente noti: le tappe storiche essenziali, le tradizioni che il viaggiatore incontrerà, le abitudini e le buone maniere locali da conoscere.</p>

${WHEN}

<h2>I luoghi che raccontano ${dest}</h2>
<ul>
<li><b>Nome reale del luogo:</b> cosa è e quale parte della storia o della cultura locale racconta (2-4 righe).</li>
(esattamente 5 voci)
</ul>

[IMG_ACTIVITY: 3-5 parole inglesi dell'attività o luogo più caratteristico]

<h2>Esperienze per entrare nel posto</h2>
<ul>
<li><b>Nome esperienza:</b> descrizione in 2-3 righe.</li>
(esattamente 4 voci, pensate per tipi di viaggiatore diversi)
</ul>

${FOOD_INTRO}

${STAY_MOVE}

${COMMON_TAIL}`,
  },
];

export function pickLayout(): ArticleLayout {
  return ARTICLE_LAYOUTS[Math.floor(Math.random() * ARTICLE_LAYOUTS.length)];
}

// Frasi che fingono una presenza sul posto: l'articolo è scritto con l'aiuto
// dell'AI e non deve spacciarsi per il racconto di un viaggio vissuto.
const FAKE_EXPERIENCE =
  /(?<![\p{L}])(ci sono stat[oa]|ho (?:visitato|provato|mangiato|dormito|camminato|assaggiato|vissuto|girato|percorso|esplorato)|durante il mio|la mia (?:visita|esperienza|ultima|ultimo|prima)|secondo la mia esperienza|personalmente)(?![\p{L}])/iu;

export const MIN_WORDS = 1100;

// Restituisce il motivo dello scarto, oppure null se il testo è accettabile.
export function checkArticleQuality(html: string): string | null {
  const text = html
    .replace(/\[(IMG_LANDMARK|IMG_ACTIVITY|IMG_FOOD):[^\]]*\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  if (words < MIN_WORDS) return `troppo corto: ${words} parole (minimo ${MIN_WORDS})`;
  const h2 = (html.match(/<h2[\s>]/gi) ?? []).length;
  if (h2 < 6) return `struttura incompleta: solo ${h2} sezioni <h2>`;
  const h3 = (html.match(/<h3[\s>]/gi) ?? []).length;
  if (h3 < 3) return `mancano le domande frequenti (solo ${h3} <h3>)`;
  const fake = text.match(FAKE_EXPERIENCE);
  if (fake) return `finta esperienza in prima persona ("${fake[0]}")`;
  return null;
}
