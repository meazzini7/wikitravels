import { NextRequest, NextResponse } from "next/server";
import { generatePromoPost } from "../../../../scripts/generate-promo-post";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Genera didascalia + recupera immagine e pubblica su Facebook/Instagram:
// più chiamate esterne in sequenza, può superare i 10s di default di Vercel.
export const maxDuration = 45;

// Vercel Cron chiama questo endpoint 1 volta al giorno (vedi vercel.json).
// A differenza di /api/cron/generate-article, questo NON salva né pubblica
// nulla sul sito: serve solo a pubblicare un post promozionale (spiega una
// funzionalità, invita a iscriversi...) su Facebook e Instagram, quindi non
// serve nessun revalidatePath.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const result = await generatePromoPost();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("Generazione post promozionale fallita:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
