import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site-info";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Come WikiTravels tratta i dati personali: quali raccoglie, perché, con chi li condivide e come esercitare i tuoi diritti.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Informativa sulla privacy" intro="Cosa facciamo con i tuoi dati, in parole semplici.">
      <h2>Chi tratta i dati</h2>
      <p>
        Il titolare del trattamento è il gestore del sito {SITE_NAME}. Per qualsiasi richiesta scrivi a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Se leggi soltanto le guide</h2>
      <p>
        Puoi leggere l&apos;Enciclopedia senza registrarti e senza darci dati. Come ogni sito, il server su cui è
        ospitato (Vercel) registra per brevi periodi dati tecnici come indirizzo IP e tipo di browser, per sicurezza e
        corretto funzionamento.
      </p>

      <h2>Cookie e pubblicità</h2>
      <p>
        <strong>Cookie tecnici:</strong> servono al funzionamento del sito (accesso all&apos;account, lingua scelta) e
        non richiedono consenso.
      </p>
      <p>
        <strong>Statistiche:</strong> usiamo Google Analytics per capire, in forma statistica, quali pagine vengono
        lette e per quanto tempo. Imposta cookie (_ga) con durata fino a 2 anni.
      </p>
      <p>
        <strong>Pubblicità:</strong> il sito può mostrare annunci di Google AdSense. Google e i suoi partner possono
        usare cookie per mostrare annunci in base alle tue visite a questo e ad altri siti. Puoi gestire o disattivare
        gli annunci personalizzati da{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          adssettings.google.com
        </a>{" "}
        e leggere come Google usa i dati su{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
          policies.google.com/technologies/partner-sites
        </a>
        . Puoi anche cancellare o bloccare i cookie dalle impostazioni del browser.
      </p>

      <h2>Se crei un account</h2>
      <p>Per usare viaggi, community e chat trattiamo:</p>
      <ul>
        <li>
          <strong>dati dell&apos;account:</strong> indirizzo email, nome visualizzato e foto (anche se accedi con
          Google), gestiti tramite Firebase Authentication;
        </li>
        <li>
          <strong>dati del profilo:</strong> i tuoi interessi, le mete dei sogni, chi segui e chi ti segue, i
          distintivi;
        </li>
        <li>
          <strong>i contenuti che pubblichi:</strong> viaggi, tappe, date e chilometri, e i messaggi della chat. I
          viaggi privati sono visibili solo a te; di quelli pubblici è visibile un&apos;anteprima e, dopo l&apos;accesso,
          i dettagli.
        </li>
      </ul>
      <p>
        Li usiamo per fornirti il servizio che hai richiesto (base giuridica: esecuzione del contratto), per
        personalizzare i suggerimenti in base ai tuoi interessi e per inviarti le notifiche collegate al servizio, per
        esempio un invito a un viaggio o una nuova guida su una meta dei sogni (anche via email).
      </p>

      <h2>Con chi condividiamo i dati</h2>
      <p>Ci appoggiamo a fornitori che trattano i dati per nostro conto:</p>
      <ul>
        <li>Google Firebase (accesso, database e archiviazione dei file);</li>
        <li>Vercel (hosting del sito);</li>
        <li>Resend (invio delle email di notifica);</li>
        <li>
          Google Gemini (funzioni di intelligenza artificiale, per esempio suggerire punti di interesse o tradurre le
          guide): riceve i testi necessari alla richiesta, non il tuo profilo;
        </li>
        <li>Unsplash (fotografie di copertina);</li>
        <li>Google Analytics e Google AdSense (statistiche e pubblicità, vedi sopra).</li>
      </ul>
      <p>
        Alcuni di questi fornitori hanno sede negli Stati Uniti: il trasferimento avviene con le garanzie previste dal
        GDPR (come le clausole contrattuali standard o il Data Privacy Framework). Non vendiamo i tuoi dati.
      </p>

      <h2>Per quanto tempo</h2>
      <p>
        Conserviamo i dati dell&apos;account finché lo mantieni attivo. Se ne chiedi la cancellazione, li eliminiamo,
        salvo ciò che dobbiamo conservare per obbligo di legge.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne l&apos;uso, riceverli in un
        formato portabile e opporti al trattamento;. Scrivi a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Se ritieni che i tuoi diritti non siano rispettati
        puoi rivolgerti al Garante per la protezione dei dati personali (
        <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
          garanteprivacy.it
        </a>
        ).
      </p>

      <h2>Minori</h2>
      <p>Il servizio non è pensato per chi ha meno di 14 anni, che non devono registrarsi senza un genitore.</p>

      <h2>Modifiche</h2>
      <p>Se cambiamo il modo in cui trattiamo i dati aggiorniamo questa pagina e la data qui sopra.</p>
    </LegalPage>
  );
}
