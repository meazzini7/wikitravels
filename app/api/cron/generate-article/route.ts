import { NextRequest, NextResponse } from "next/server";
import { generateArticle } from "../../../../scripts/generate-article";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Genera contenuto + copertina + immagini interne con più chiamate esterne
// in sequenza (Gemini, Unsplash, upload su Storage): può superare i 10s di
// default di Vercel, quindi estendiamo il limite al massimo consentito sul
// piano Hobby.
export const maxDuration = 60;

// Vercel Cron chiama questo endpoint 1 volta al giorno (vedi vercel.json).
// Protetto da CRON_SECRET così nessun altro può triggerarlo (vedi
// lib/cron-auth.ts per il fallback manuale via ?secret=).
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const result = await generateArticle();
  return NextResponse.json({ ok: true, result });
}
