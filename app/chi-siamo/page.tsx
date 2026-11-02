import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Chi siamo",
  description: "Cos'è WikiTravels, a chi serve e come è fatto il portale: viaggi, community ed enciclopedia di destinazioni.",
  alternates: { canonical: "/chi-siamo" },
};

export default function ChiSiamoPage() {
  return (
    <LegalPage
      title="Chi siamo"
      intro="WikiTravels è un portale italiano per chi ama viaggiare e vuole organizzare, raccontare e scoprire."
      showUpdated={false}
    >
      <h2>Cosa trovi</h2>
      <ul>
        <li>
          <strong>I viaggi:</strong> crei un itinerario a tappe con i punti di interesse da visitare, lo tieni privato
          o lo condividi, e puoi invitare chi viaggia con te.
        </li>
        <li>
          <strong>La community:</strong> trovi viaggiatori con interessi simili ai tuoi, segui chi ti ispira e scambi
          consigli in chat.
        </li>
        <li>
          <strong>L&apos;Enciclopedia:</strong> guide di destinazione con cosa vedere, cosa fare, cucina locale, budget
          indicativo e consigli pratici, pensate per diversi tipi di viaggiatore.
        </li>
      </ul>

      <h2>Un progetto indipendente</h2>
      <p>
        WikiTravels è un progetto indipendente, gestito da una persona e non legato ad agenzie, compagnie aeree o
        strutture ricettive. Per tenere il servizio gratuito potremo in futuro mostrare pubblicità o link di
        affiliazione: se succederà, saranno sempre riconoscibili come tali e non cambieranno ciò che scriviamo.
      </p>

      <h2>Come nascono le guide</h2>
      <p>
        Le guide dell&apos;Enciclopedia sono prodotte con l&apos;aiuto dell&apos;intelligenza artificiale e non sono il
        racconto di un viaggio vissuto in prima persona. Lo spieghiamo con trasparenza nella pagina{" "}
        <Link href="/come-scriviamo-gli-articoli">Come scriviamo gli articoli</Link>, insieme ai limiti da tenere a
        mente e a come segnalarci un errore.
      </p>

      <h2>Scrivici</h2>
      <p>
        Suggerimenti, correzioni, collaborazioni: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, oppure la
        pagina <Link href="/contatti">Contatti</Link>.
      </p>
    </LegalPage>
  );
}
