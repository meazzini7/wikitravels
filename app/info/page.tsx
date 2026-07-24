import type { Metadata } from "next";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";
import FlamingoMascot from "@/components/FlamingoMascot";

export const metadata: Metadata = {
  title: "Come funziona WikiTravels",
  description: "Tutto quello che c'è da sapere su WikiTravels: come creare un viaggio, gli interessi, i distintivi, l'enciclopedia e molto altro.",
  alternates: { canonical: "/info" },
};

const FAQS: FaqItem[] = [
  {
    question: "Cos'è WikiTravels?",
    answer:
      "È il portale social per viaggiatori: crei i tuoi viaggi a bottoni, li condividi con la community, trovi persone con i tuoi stessi interessi e leggi guide di destinazione aggiornate ogni giorno nella nostra Enciclopedia.",
  },
  {
    question: "Perché mi chiede di impostare i miei interessi appena mi registro?",
    answer:
      "Gli interessi (avventura, cultura, spiritualità, divertimento, natura, sport, da 0 a 10 ciascuno) sono il cuore del matching di WikiTravels: servono per suggerirti i viaggi della community più in linea con i tuoi gusti nel Feed, per trovare persone con interessi simili ai tuoi, e per proporti gli articoli dell'Enciclopedia più adatti a te. Per questo vanno impostati prima di usare il resto del portale.",
  },
  {
    question: "Come creo un viaggio?",
    answer:
      "Tocca il bottone ✚ (in basso al centro su mobile, o \"Crea un viaggio\" in home/profilo). Il wizard ti guida in 4 passaggi: dettagli e interessi del viaggio, tappe con i punti di interesse da visitare, copertina generata dall'AI, e riepilogo finale prima di pubblicare.",
  },
  {
    question: "Perché il viaggio ha i suoi interessi, oltre ai miei?",
    answer:
      "Perché non tutti i tuoi viaggi sono uguali: puoi fare sia un giro culturale rilassato che un'avventura estrema. Gli interessi specifici del viaggio (impostabili nel primo passaggio del wizard) fanno sì che venga proposto a chi cerca esattamente quel tipo di esperienza, indipendentemente dai tuoi interessi generali.",
  },
  {
    question: "Come funzionano i punti di interesse delle tappe?",
    answer:
      'Quando aggiungi una tappa (es. "Roma"), tocca la tappa per vedere i punti di interesse più famosi del posto, suggeriti dall\'intelligenza artificiale. Selezionane quanti vuoi e vota da 0 a 10 quanto vale la pena visitarli. Se vuoi altre idee, usa il bottone "Altri suggerimenti".',
  },
  {
    question: "Cosa sono le mete dei sogni?",
    answer:
      "Sono i posti che vorresti visitare, salvabili dal tuo profilo. Quando qualcuno pubblica un viaggio o esce un nuovo articolo dell'Enciclopedia su una di quelle mete, ricevi una notifica.",
  },
  {
    question: "Posso invitare altre persone in un viaggio che ho creato?",
    answer:
      "Sì: dalla pagina del tuo viaggio puoi cercare e invitare altri utenti come partecipanti. Chi ricevi l'invito lo vede tra le notifiche e può accettarlo o rifiutarlo direttamente dalla pagina del viaggio. Chi accetta vede quel viaggio contare anche per le proprie statistiche (viaggi, km, città, nazioni) e per i propri distintivi.",
  },
  {
    question: "Posso modificare o eliminare un viaggio dopo averlo pubblicato?",
    answer:
      "Sì, sempre e solo se sei tu ad averlo creato: dalla pagina del viaggio trovi i bottoni \"Modifica\" (riapre lo stesso wizard con tutti i dati già inseriti) ed \"Elimina\" (cancellazione definitiva, da confermare).",
  },
  {
    question: "Che differenza c'è tra viaggio pubblico e privato?",
    answer:
      "Un viaggio pubblico ha un'anteprima (titolo, copertina, date, km) visibile a chiunque nella community; tappe, mappa e dettagli completi si vedono solo effettuando l'accesso. Un viaggio privato non è mai visibile a nessun altro, solo a te.",
  },
  {
    question: "Cos'è l'Enciclopedia?",
    answer:
      "Una raccolta di guide di destinazione scritte dall'intelligenza artificiale e aggiornata ogni giorno con un nuovo articolo: cosa vedere, cosa fare, dove mangiare, budget indicativo e un consiglio da local per ogni meta.",
  },
  {
    question: "In che lingua vedo il portale e gli articoli?",
    answer:
      "WikiTravels riconosce automaticamente la lingua del tuo telefono o computer (puoi comunque cambiarla manualmente con il selettore 🌐 in alto). Gli articoli dell'Enciclopedia vengono tradotti automaticamente dall'intelligenza artificiale la prima volta che li apri in una lingua diversa dall'italiano.",
  },
  {
    question: "Come trovo persone con i miei stessi interessi?",
    answer:
      'Nel tuo profilo, nella sezione "Persone come te", trovi altri viaggiatori con interessi simili ai tuoi. Anche nel profilo di ogni altro utente vedi una percentuale di affinità con te, calcolata sugli interessi di entrambi.',
  },
  {
    question: "Come funzionano i distintivi (badge)?",
    answer:
      "Si sbloccano automaticamente man mano che usi il portale: pubblicando viaggi, percorrendo km, visitando città e nazioni, guadagnando follower, seguendo altri viaggiatori, salvando mete dei sogni e portando i tuoi interessi al massimo. Nel profilo vedi quelli già sbloccati a colori e un'anteprima dei prossimi da sbloccare in bianco e nero; tocca \"Vedi tutti\" per l'elenco completo con quello che serve per ottenere ciascuno.",
  },
  {
    question: "Cosa sono Feed, Classifica e Chat?",
    answer:
      "Il Feed mostra i viaggi pubblici della community ordinati per affinità con i tuoi interessi. La Classifica premia chi ha percorso più km. La Chat ti permette di scrivere direttamente ad altri viaggiatori che segui o che ti seguono.",
  },
  {
    question: "Posso invitare amici su WikiTravels?",
    answer:
      "Sì: nel tuo profilo trovi un link di invito personale (breve e facile da condividere) e un bottone per invitare direttamente su WhatsApp.",
  },
];

export default function InfoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <FlamingoMascot className="h-14 w-14" />
        <h1 className="font-heading text-2xl font-extrabold text-gray-900 sm:text-3xl">Come funziona WikiTravels</h1>
        <p className="max-w-md text-sm text-gray-500">
          Tutto quello che c&apos;è da sapere per orientarti nel portale, in poche domande.
        </p>
      </div>
      <FaqAccordion items={FAQS} />
    </main>
  );
}
