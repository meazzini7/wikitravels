import type { Metadata } from "next";
import Link from "next/link";
import { isValidAdminSecret } from "@/lib/server/admin-auth";
import { checkSocialHealth } from "@/lib/server/social-health";
import { getInsights } from "@/lib/server/performance-insights";
import { DashboardView, HealthSection, SetupGuide } from "@/components/admin/DashboardView";

// Pagina riservata: sempre renderizzata a ogni richiesta (mai statica, mai
// in cache), non indicizzabile, e senza inviare il referrer così il segreto
// nell'indirizzo non finisce in nessun'altra pagina visitata da qui.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cruscotto",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const SOURCE_LABELS = {
  fresh: "Dati appena aggiornati",
  cache: "Dati aggiornati automaticamente ogni 12 ore",
  stale: "Ultimo salvataggio disponibile: l'aggiornamento non è riuscito",
  unavailable: "Nessun dato disponibile",
} as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { secret?: string; refresh?: string };
}) {
  if (!isValidAdminSecret(searchParams.secret)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-600">Non autorizzato.</p>
      </main>
    );
  }
  const secret = searchParams.secret as string;
  const base = `/admin/dashboard?secret=${encodeURIComponent(secret)}`;

  const [result, health] = await Promise.all([getInsights({ force: searchParams.refresh === "1" }), checkSocialHealth()]);
  const { insights } = result;
  const gaOk = !!insights && !result.error;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:py-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold text-gray-900">📊 Cruscotto</h1>
          <p className="text-xs text-gray-500">
            {SOURCE_LABELS[result.source]}
            {insights && ` · ${new Date(insights.generatedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" })}`}
          </p>
        </div>
        <Link
          href={`${base}&refresh=1`}
          className="tap-scale flex min-h-[44px] shrink-0 items-center rounded-full bg-brand-600 px-4 text-sm font-bold text-white shadow-pop"
        >
          ↻ Aggiorna
        </Link>
      </div>

      <HealthSection health={health} gaOk={gaOk} secret={secret} />
      {result.error && <SetupGuide error={result.error} />}
      {insights && <DashboardView insights={insights} />}
    </main>
  );
}
