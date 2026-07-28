import "server-only";

// Client Resend minimale condiviso da tutte le email del portale (report
// giornaliero admin, notifiche utente...): una singola chiamata REST,
// niente SDK aggiuntivo. Piano gratuito Resend, coerente con la scelta di
// non introdurre servizi a pagamento.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: email non inviata.");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "WikiTravels <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Invio email fallito:", await res.text());
    return false;
  }
  return true;
}
