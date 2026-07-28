import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { sendNotificationEmailByUid, type NotificationEmailData } from "@/lib/server/notification-email";

// Il portale non è un'app e non può mandare push notification: ogni
// notifica in-app (follow, nuovo viaggio, invito, meta dei sogni) passa
// anche da qui per avvisare l'utente via email. Richiede un token valido
// solo per evitare abusi dall'esterno (spam di email arbitrarie), non è
// un'operazione sensibile in sé.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const body = await req.json();
  const targetUid = body?.targetUid;
  if (!targetUid || typeof targetUid !== "string") {
    return NextResponse.json({ error: "targetUid mancante" }, { status: 400 });
  }

  const data: NotificationEmailData = {
    type: body.type,
    fromUid: body.fromUid ?? null,
    fromNickname: body.fromNickname ?? null,
    tripId: body.tripId ?? null,
    tripTitle: body.tripTitle ?? null,
    articleSlug: body.articleSlug ?? null,
    articleTitle: body.articleTitle ?? null,
    destinationName: body.destinationName ?? null,
  };

  await sendNotificationEmailByUid(targetUid, data);
  return NextResponse.json({ ok: true });
}
