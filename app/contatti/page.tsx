import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Contatti",
  description: "Come contattare WikiTravels per segnalazioni, correzioni, richieste sui dati personali e collaborazioni.",
  alternates: { canonical: "/contatti" },
};

export default function ContattiPage() {
  return (
    <LegalPage title="Contatti" intro="Rispondiamo a mano, di solito entro pochi giorni." showUpdated={false}>
      <p>
        Scrivici a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>Per cosa puoi scriverci</h2>
      <ul>
        <li>segnalare un errore o un&apos;informazione non aggiornata in una guida;</li>
        <li>chiedere di vedere, correggere o cancellare i tuoi dati o il tuo account (vedi la pagina Privacy);</li>
        <li>segnalare un contenuto inappropriato pubblicato da un utente;</li>
        <li>proporre una collaborazione o un suggerimento per migliorare il portale.</li>
      </ul>
      <p>Indica sempre l&apos;indirizzo della pagina a cui ti riferisci: ci aiuta a risponderti più in fretta.</p>
    </LegalPage>
  );
}
