import "server-only";
import { getAdminDb } from "../firebase-admin";
import { getSiteUrl } from "../site-url";
import { sendEmail } from "./resend";
import type { Notification } from "../types";

// Sottoinsieme dei campi di Notification necessari per comporre l'email:
// gli stessi valori già scritti nel documento Firestore, così non serve
// ricalcolare nulla, solo passarli quando si crea la notifica.
export type NotificationEmailData = Pick<
  Notification,
  "type" | "fromUid" | "tripId" | "tripTitle" | "articleSlug" | "articleTitle" | "destinationName"
> & { fromNickname?: string | null };

function shell(title: string, bodyHtml: string, ctaLabel: string, ctaHref: string): string {
  return `<div style="font-family:sans-serif;color:#111;max-width:480px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#dd2166,#f13e7e);padding:24px;border-radius:16px 16px 0 0;text-align:center;">
      <span style="font-size:40px;">🦩</span>
      <h1 style="color:white;font-size:20px;margin:8px 0 0;">WikiTravels</h1>
    </div>
    <div style="background:#fff7f9;padding:24px;border-radius:0 0 16px 16px;">
      <h2 style="color:#111;font-size:17px;margin:0 0 12px;">${title}</h2>
      <p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 20px;">${bodyHtml}</p>
      <a href="${ctaHref}" style="display:inline-block;background:#dd2166;color:white;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;font-size:14px;">${ctaLabel}</a>
    </div>
    <p style="text-align:center;font-size:11px;color:#aaa;margin-top:12px;">
      Ricevi questa email perché è successo qualcosa che ti riguarda su WikiTravels.
    </p>
  </div>`;
}

// Un fallback difensivo (fromNickname assente, dati mancanti) non deve mai
// impedire l'invio: meglio un testo un po' generico che nessuna email.
function buildEmail(data: NotificationEmailData): { subject: string; html: string } | null {
  const siteUrl = getSiteUrl();
  const who = data.fromNickname ? `@${data.fromNickname}` : "Qualcuno";

  switch (data.type) {
    case "follow":
      return {
        subject: `🦩 ${who} ha iniziato a seguirti su WikiTravels`,
        html: shell(
          `${who} ha iniziato a seguirti!`,
          `Seguilo anche tu: quando vi seguite a vicenda potete vedere i rispettivi dati personali e i viaggi fatti insieme.`,
          "Vai al suo profilo",
          `${siteUrl}/utenti/${data.fromUid}`
        ),
      };
    case "trip":
      return {
        subject: `🧳 Nuovo viaggio pubblicato da ${who}`,
        html: shell(
          `${who} ha pubblicato un nuovo viaggio`,
          `"${data.tripTitle ?? "Un nuovo viaggio"}" è ora visibile nel Feed. Dagli un'occhiata!`,
          "Guarda il viaggio",
          `${siteUrl}/viaggi/${data.tripId}`
        ),
      };
    case "dream_trip":
      return {
        subject: `🌟 Nuovo viaggio verso ${data.destinationName ?? "una tua meta dei sogni"}`,
        html: shell(
          `Nuovo viaggio verso una tua meta dei sogni`,
          `È stato pubblicato "${data.tripTitle ?? "un nuovo viaggio"}"${
            data.destinationName ? ` verso <strong>${data.destinationName}</strong>` : ""
          }, una delle mete che hai salvato.`,
          "Guarda il viaggio",
          `${siteUrl}/viaggi/${data.tripId}`
        ),
      };
    case "trip_invite":
      return {
        subject: `✉️ ${who} ti ha invitato a un viaggio`,
        html: shell(
          `Sei stato invitato a un viaggio!`,
          `${who} ti ha invitato a partecipare a "${data.tripTitle ?? "un viaggio"}". Accetta o rifiuta dalla pagina del viaggio.`,
          "Rispondi all'invito",
          `${siteUrl}/viaggi/${data.tripId}`
        ),
      };
    case "dream_article":
      return {
        subject: `📖 Nuovo articolo su ${data.destinationName ?? "una tua meta dei sogni"}`,
        html: shell(
          `Nuovo articolo su una tua meta dei sogni`,
          `È uscito "${data.articleTitle ?? "un nuovo articolo"}"${
            data.destinationName ? ` su <strong>${data.destinationName}</strong>` : ""
          } nella nostra Enciclopedia.`,
          "Leggi l'articolo",
          `${siteUrl}/enciclopedia/${data.articleSlug}`
        ),
      };
    default:
      return null;
  }
}

// Recupera l'email del destinatario (lato Admin SDK, non passa dalle
// regole Firestore lato client) e invia. Pensata per non lanciare mai
// un'eccezione che possa interrompere il flusso chiamante: chi invita
// qualcuno o pubblica un viaggio non deve vedere fallire l'operazione
// principale solo perché l'invio dell'email ha avuto un problema.
export async function sendNotificationEmailByUid(targetUid: string, data: NotificationEmailData): Promise<void> {
  try {
    const email = buildEmail(data);
    if (!email) return;

    const snap = await getAdminDb().collection("users").doc(targetUid).get();
    const to = snap.data()?.email;
    if (!to || typeof to !== "string") return;

    await sendEmail({ to, subject: email.subject, html: email.html });
  } catch (err) {
    console.error("Impossibile inviare l'email di notifica:", err);
  }
}
