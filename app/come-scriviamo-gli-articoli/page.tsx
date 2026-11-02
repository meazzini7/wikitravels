import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Come scriviamo gli articoli",
  description:
    "Come nascono le guide dell'Enciclopedia di WikiTravels: uso dell'intelligenza artificiale, limiti, verifiche e come segnalare un errore.",
  alternates: { canonical: "/come-scriviamo-gli-articoli" },
};

export default function ComeScriviamoPage() {
  return (
    <LegalPage
      title="Come scriviamo gli articoli"
      intro="Una pagina di trasparenza: cosa c'è dietro le guide dell'Enciclopedia e quanto fidarsene."
    >
      <h2>Come vengono prodotte</h2>
      <p>
        Ogni guida è generata con un modello di intelligenza artificiale a partire da una destinazione e da un tipo di
        viaggio (per esempio un weekend, un viaggio di avventura o uno romantico). Il testo ha una struttura
        riconoscibile: perché scegliere la meta, quando andare, cosa vedere, cosa fare, cucina locale, dove dormire e
        come muoversi, budget indicativo e un consiglio pratico. Le fotografie di copertina vengono da{" "}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">
          Unsplash
        </a>{" "}
        e sono accreditate agli autori.
      </p>

      <h2>Cosa non sono</h2>
      <ul>
        <li>Non sono il racconto di chi ha visitato quel luogo: nessuna guida è una recensione o una testimonianza.</li>
        <li>
          Non sono sempre aggiornate: orari, prezzi, aperture, regole di ingresso e condizioni meteo cambiano, e il
          modello può sbagliare o semplificare.
        </li>
        <li>
          Il budget è una stima di ordine di grandezza, non un preventivo. Non indichiamo ristoranti o strutture
          specifiche come raccomandazioni verificate.
        </li>
      </ul>

      <h2>Cosa ti consigliamo di fare</h2>
      <p>
        Usa le guide per farti un&apos;idea e trovare spunti, poi controlla sempre le fonti ufficiali (siti dei luoghi
        da visitare, enti del turismo, compagnie di trasporto, Ministero degli Esteri per i requisiti di viaggio)
        prima di prenotare o partire. Ogni guida lo ricorda in fondo.
      </p>

      <h2>Se trovi un errore</h2>
      <p>
        Scrivici a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> indicando la guida e cosa non torna: la
        controlliamo e, se hai ragione, la correggiamo o la rimuoviamo. Puoi anche contattarci dalla pagina{" "}
        <Link href="/contatti">Contatti</Link>.
      </p>

      <h2>Pubblicità e link di affiliazione</h2>
      <p>
        Al momento le guide non contengono pubblicità. Se in futuro la inseriremo, o useremo link di affiliazione, lo
        indicheremo chiaramente e non influirà su ciò che consigliamo.
      </p>
    </LegalPage>
  );
}
