import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { askGemini } from "@/lib/server/gemini";
import { fetchAndUploadImage } from "@/lib/server/fetch-and-upload-image";

// Gemini + Unsplash + upload su Storage in sequenza possono superare i 10s
// di default di Vercel (probabile causa dei fallimenti della copertina AI).
export const maxDuration = 60;

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

  const { title, description } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Titolo mancante" }, { status: 400 });
  }

  try {
    const rawQuery = await askGemini(
      `Titolo viaggio: "${title}". Descrizione: "${description ?? ""}". Restituisci SOLO 3-6 parole in inglese per cercare una foto suggestiva su un sito di stock photo (es. "Tuscany rolling hills sunset"). Nessuna virgolettatura, nessuna spiegazione, nessun markdown.`
    );
    const query = rawQuery.trim().replace(/^["']|["']$/g, "") || title;

    const image = await fetchAndUploadImage(query);
    if (!image) {
      return NextResponse.json({ error: "Impossibile generare la copertina, riprova." }, { status: 502 });
    }

    return NextResponse.json({ image, query });
  } catch (err) {
    console.error("Generazione copertina fallita:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
