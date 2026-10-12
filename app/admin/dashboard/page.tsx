import type { Metadata } from "next";
import Link from "next/link";
import { isValidAdminSecret } from "@/lib/server/admin-auth";
import { checkSocialHealth } from "@/lib/server/social-health";
import { getInsights } from "@/lib/server/performance-insights";
import { Card, DashboardView, SetupGuide } from "@/components/admin/DashboardView";

// Pagina riservata: sempre renderizzata a ogni richiesta (mai statica, mai
// in cache), non indicizzabile, e senza inviare il referrer così il segreto
// nell'indirizzo non finisce in nessun'altra pagina visitata da qui.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pannello di controllo",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const SOURCE_LABELS = {
  fresh: "Dati appena aggiornati da Google Analytics",
  cache: "Dati in cache (si aggiornano da soli ogni 12 ore)",
  stale: "Ultimo snapshot disponibile: l'aggiornamento è fallito, vedi sotto",
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
  const base = `/admin/dashboard?secret=${encodeURIComponent(searchParams.secret as string)}`;

  const [result, health] = await Promise.all([getInsights({ force: searchParams.refresh === "1" }), checkSocialHealth()]);
  const { insights } = result;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="font-heading text-2xl font-extrabold text-gray-900">📊 Pannello di controllo</h1>
      <p className="mb-6 text-sm text-gray-500">
        {SOURCE_LABELS[result.source]}
        {insights && (
          <>
            {" "}
            · {new Date(insights.generatedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
          </>
        )}
      </p>

      <Card title="🔗 Salute dei collegamenti social" subtitle="Se uno è in errore, quel social non riceve più i post automatici.">
        <ul className="space-y-2 text-sm">
          {health.map((h) => (
            <li key={h.key} className={`rounded-xl p-3 ${h.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
              <strong>
                {h.ok ? "✅" : "⚠️"} {h.label}
              </strong>
              <span className="block text-xs">{h.detail}</span>
              {!h.ok && h.key === "instagram" && (
                <span className="mt-1 block text-xs">
                  Il collegamento Instagram dura circa 60 giorni: per rinnovarlo apri{" "}
                  <Link href={`/admin/instagram-connect?secret=${encodeURIComponent(searchParams.secret as string)}`} className="underline">
                    /admin/instagram-connect
                  </Link>{" "}
                  e copia i due nuovi valori su Vercel.
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {result.error && <SetupGuide error={result.error} />}
      {insights && <DashboardView insights={insights} base={base} />}
    </main>
  );
}
