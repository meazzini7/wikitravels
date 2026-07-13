import { NextRequest, NextResponse } from "next/server";
import { generateArticle } from "../../../../scripts/generate-article";

// Vercel Cron chiama questo endpoint 1 volta al giorno (vedi vercel.json).
// Protetto da CRON_SECRET così nessun altro può triggerarlo.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const result = await generateArticle();
  return NextResponse.json({ ok: true, result });
}
