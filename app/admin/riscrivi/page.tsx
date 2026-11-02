import type { Metadata } from "next";
import Link from "next/link";
import { isValidAdminSecret } from "@/lib/server/admin-auth";
import { countArticlesToRewrite } from "@/scripts/rewrite-article";
import RewriteRunner from "@/components/admin/RewriteRunner";

// Pagina riservata (stesso segreto del Cruscotto): mai statica, mai indicizzata.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Rinnova articoli",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RewritePage({ searchParams }: { searchParams: { secret?: string } }) {
  if (!isValidAdminSecret(searchParams.secret)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-600">Non autorizzato.</p>
      </main>
    );
  }
  const secret = searchParams.secret as string;

  let remaining: number | null = null;
  try {
    remaining = await countArticlesToRewrite();
  } catch (err) {
    console.error("Impossibile contare gli articoli da rinnovare:", err);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-5 sm:py-8">
      <div className="mb-4">
        <Link
          href={`/admin/dashboard?secret=${encodeURIComponent(secret)}`}
          className="text-sm font-bold text-brand-600"
        >
          ← Cruscotto
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-extrabold text-gray-900">✍️ Rinnova gli articoli</h1>
        <p className="mt-1 text-sm text-gray-600">
          Riscrive gli articoli vecchi con le nuove regole: niente esperienze inventate, struttura varia, informazioni
          pratiche per chi parte dall&apos;Italia, domande frequenti. Indirizzo, visite, copertina e foto restano gli
          stessi.
        </p>
      </div>
      <RewriteRunner secret={secret} initialRemaining={remaining} />
    </main>
  );
}
