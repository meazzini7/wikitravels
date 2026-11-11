import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { countArticlesToRewrite, rewriteNextOldArticle } from "../../../../scripts/rewrite-article";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Una riscrittura = una chiamata AI lunga + metadati: serve il massimo del
// piano Hobby, come per la generazione di un nuovo articolo.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Riscrive UN articolo vecchio per chiamata (la pagina /admin/riscrivi le
// concatena). Con ?count=1 si limita a dire quanti ne restano.
// Protetta dallo stesso segreto dei cron (?secret=...).
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    if (req.nextUrl.searchParams.get("count") === "1") {
      return NextResponse.json({ ok: true, remaining: await countArticlesToRewrite() });
    }

    const result = await rewriteNextOldArticle();
    if (result.ok && result.slug) {
      revalidatePath(`/enciclopedia/${result.slug}`);
      revalidatePath("/enciclopedia");
      revalidatePath("/");
      revalidatePath("/sitemap.xml");
      revalidateTag("articles");
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Riscrittura articoli fallita:", err);
    return NextResponse.json(
      { ok: false, remaining: -1, error: err instanceof Error ? err.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
