import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { askGemini } from "@/lib/server/gemini";
import { fetchAndUploadImage } from "@/lib/server/fetch-and-upload-image";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "Token non valido" }, { status: 401 });
  }

  const { title, description, tripId } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Titolo mancante" }, { status: 400 });
  }

  const rawQuery = await askGemini(
    `Titolo viaggio: "${title}". Descrizione: "${description ?? ""}". Restituisci SOLO 3-6 parole in inglese per cercare una foto suggestiva su un sito di stock photo (es. "Tuscany rolling hills sunset"). Nessuna virgolettatura, nessuna spiegazione, nessun markdown.`
  );
  const query = rawQuery.trim().replace(/^["']|["']$/g, "") || title;

  const path = `trips/${uid}/${tripId ?? Date.now()}/cover.jpg`;
  const image = await fetchAndUploadImage(query, path);
  if (!image) {
    return NextResponse.json({ error: "Impossibile generare la copertina, riprova." }, { status: 502 });
  }

  return NextResponse.json({ image, query });
}
