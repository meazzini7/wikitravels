import { NextRequest, NextResponse } from "next/server";
import { sendDailyReportEmail } from "../../../../scripts/daily-report";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const maxDuration = 60;

// Vercel Cron chiama questo endpoint 1 volta al giorno (vedi vercel.json).
// Protetto da CRON_SECRET così nessun altro può triggerarlo (vedi
// lib/cron-auth.ts per il fallback manuale via ?secret=).
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const result = await sendDailyReportEmail();
  return NextResponse.json({ ok: true, ...result });
}
