import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import CookieSettingsButton from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Cookie",
  description: "Quali cookie e tecnologie simili usa WikiTravels, a cosa servono e come cambiare le tue scelte.",
  alternates: { canonical: "/cookie" },
};

export default function CookiePage() {
  return (
    <LegalPage title="Cookie" intro="Quali cookie usiamo, a cosa servono e come puoi scegliere.">
      <h2>Cookie tecnici (sempre attivi)</h2>
      <p>
        Servono al funzionamento del sito e non richiedono consenso: mantengono l&apos;accesso al tuo account
        (Firebase Authentication) e ricordano le preferenze come la lingua scelta e la tua scelta sui cookie. Senza
        di loro parti del portale non funzionerebbero.
      </p>

      <h2>Cookie di misurazione (solo se accetti)</h2>
      <p>
        Usiamo Google Analytics 4 per capire, in forma statistica, quali pagine vengono lette e per quanto tempo, così
        da migliorare le guide. Questi cookie vengono impostati, e la richiesta verso Google parte, solo dopo che hai
        premuto <strong>Accetta</strong> nel banner. Se rifiuti, Google Analytics non viene caricato.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Scopo</th>
            <th>Durata</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>_ga, _ga_*</td>
            <td>Distinguere i visitatori e le sessioni in modo statistico (Google Analytics)</td>
            <td>Fino a 2 anni</td>
          </tr>
        </tbody>
      </table>

      <h2>Pubblicità</h2>
      <p>
        Al momento il sito non mostra pubblicità e non usa cookie pubblicitari. Se in futuro li introdurremo, questa
        pagina e il banner verranno aggiornati e ti chiederemo di nuovo il consenso.
      </p>

      <h2>Cambiare idea</h2>
      <p>
        Puoi modificare la scelta in qualsiasi momento: <CookieSettingsButton /> (si trova anche in fondo a ogni
        pagina) e il banner ricomparirà. Puoi anche cancellare i cookie dalle impostazioni del browser.
      </p>
      <p>
        Per sapere come trattiamo gli altri dati personali leggi la <Link href="/privacy">Privacy</Link>.
      </p>
    </LegalPage>
  );
}
