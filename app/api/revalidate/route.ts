import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

// Chiamata dal job "article" di GitHub Actions (scripts/run-cron.ts) subito
// dopo aver pubblicato un articolo: i cron non girano più su Vercel e non
// possono invalidare le pagine in cache, quindi senza questa chiamata home,
// enciclopedia e sitemap mostrerebbero il nuovo articolo solo alla
// rigenerazione oraria. Costo: una chiamata di pochi millisecondi per articolo.
// Protetta dallo stesso segreto dei cron (header Authorization: Bearer ...).
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  revalidatePath("/");
  revalidatePath("/enciclopedia");
  revalidatePath("/sitemap.xml");
  revalidateTag("articles");
  return NextResponse.json({ ok: true });
}
