import Link from "next/link";
import type { ReactNode } from "react";
import { getServiceAccountEmail } from "@/lib/server/ga-data";
import { buildRecommendations, type GroupStat, type Insights } from "@/lib/server/performance-insights";

function fmt(n: number): string {
  return n.toLocaleString("it-IT");
}

function fmtDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card-surface mb-6 p-4 sm:p-5">
      <h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-gray-500">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{empty ?? "Nessun dato."}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexBadge({ index }: { index: number }) {
  const tone =
    index >= 1.3 ? "bg-green-100 text-green-800" : index <= 0.7 ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-800";
  const icon = index >= 1.3 ? "🔥 " : index <= 0.7 ? "❄️ " : "";
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{icon}{index}×</span>;
}

function StatBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-brand-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{label}</p>
      <p className="font-heading text-2xl font-extrabold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function ProgressRow({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">
          {fmt(value)} / {fmt(goal)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function groupRows(groups: GroupStat[], learningActive: boolean): ReactNode[][] {
  return groups.map((g) => [
    <span key="l" className="font-semibold text-gray-900">
      {g.label}
    </span>,
    g.articles,
    fmt(g.views),
    g.avgScore,
    <IndexBadge key="i" index={g.index} />,
    learningActive ? `×${g.weight}` : "—",
  ]);
}

const GROUP_HEAD = ["", "Articoli", "Visite", "Punteggio medio", "Resa vs media", "Peso nella scelta"];

export function SetupGuide({ error }: { error: string | undefined }) {
  const email = getServiceAccountEmail();
  return (
    <Card
      title="🔌 Collega Google Analytics"
      subtitle="Per misurare cosa funziona serve far leggere al sito i dati di Google Analytics. Si fa una volta sola (3 passaggi):"
    >
      {error && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Ultimo errore:</strong> {error}
        </p>
      )}
      <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700">
        <li>
          Vai su <strong>console.cloud.google.com</strong>, scegli il progetto <strong>wikitravels</strong> in alto →{" "}
          <strong>API e servizi → Libreria</strong> → cerca <strong>&quot;Google Analytics Data API&quot;</strong> → clicca{" "}
          <strong>Abilita</strong>.
        </li>
        <li>
          Vai su <strong>analytics.google.com</strong> → <strong>Amministrazione</strong> (ingranaggio in basso a sinistra) →{" "}
          <strong>Gestione accesso alla proprietà</strong> → <strong>+</strong> → <strong>Aggiungi utenti</strong> → incolla questa
          email e dai il ruolo <strong>Visualizzatore</strong>:
          <code className="mt-1 block break-all rounded-lg bg-gray-100 p-2 text-xs">
            {email ?? "(non riesco a leggerla: la trovi in Firebase → Impostazioni progetto → Account di servizio)"}
          </code>
        </li>
        <li>
          Sempre in Google Analytics → <strong>Amministrazione → Dettagli proprietà</strong>: copia l&apos;
          <strong>ID proprietà</strong> (solo numeri) e salvalo su Vercel come variabile <strong>GA4_PROPERTY_ID</strong>, poi fai
          Redeploy.
        </li>
      </ol>
    </Card>
  );
}

export function DashboardView({ insights, base }: { insights: Insights; base: string }) {
  const { learning, totals } = insights;
  const tips = buildRecommendations(insights);
  const engagedPct = totals.sessions > 0 ? Math.round((totals.engagedSessions / totals.sessions) * 100) : 0;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Utenti attivi" value={fmt(totals.users)} hint={`ultimi ${insights.windowDays} giorni`} />
        <StatBox label="Sessioni" value={fmt(totals.sessions)} />
        <StatBox label="Pagine viste" value={fmt(totals.views)} />
        <StatBox label="Sessioni coinvolte" value={`${engagedPct}%`} hint="restano oltre 10s o interagiscono" />
      </div>

      <Card
        title="🧠 Apprendimento del generatore"
        subtitle={
          learning.active
            ? "Attivo: gli articoli e i post futuri vengono orientati verso ciò che rende di più (resta sempre il 25% di scelte libere per continuare a esplorare)."
            : "In raccolta dati: finché i numeri sono pochi il generatore sceglie come sempre, per non farsi ingannare dal caso."
        }
      >
        <ProgressRow label="Articoli con almeno 3 giorni di vita" value={learning.matureArticles} goal={learning.minMatureArticles} />
        <ProgressRow label="Visite complessive agli articoli" value={learning.totalViews} goal={learning.minTotalViews} />
      </Card>

      <Card title="🎯 Dove spingere di più" subtitle="Indicazioni ricavate in automatico dai dati:">
        {tips.length === 0 ? (
          <p className="text-sm text-gray-500">Ancora nessuna indicazione: serve un po&apos; di traffico.</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-800">
            {tips.map((tip, i) => (
              <li key={i} className="rounded-xl bg-brand-50/60 p-3">
                {tip}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="🏆 Classifica articoli"
        subtitle="Punteggio = visite al giorno × (1 + minuti medi di lettura). Un buon indicatore di quanto renderebbe la pubblicità."
      >
        <Table
          head={["#", "Articolo", "Età", "Visite", "Lettura media", "Punteggio"]}
          empty="Nessun articolo pubblicato."
          rows={insights.articles.slice(0, 40).map((a, i) => [
            i + 1,
            <div key="t">
              <Link href={`/enciclopedia/${a.slug}`} className="font-semibold text-gray-900 hover:text-brand-700">
                {a.title}
              </Link>
              <p className="text-xs text-gray-500">
                {a.destination} · {a.vibe} · {a.titleStyle}
              </p>
            </div>,
            `${Math.round(a.ageDays)}g`,
            a.views,
            a.users > 0 ? fmtDuration(a.avgEngagementSec) : "—",
            <strong key="s">{a.score}</strong>,
          ])}
        />
      </Card>

      <Card title="🧭 Resa per tema di viaggio" subtitle="Quali tipi di articolo funzionano meglio (media ridimensionata se i dati sono pochi).">
        <Table head={GROUP_HEAD} rows={groupRows(insights.byVibe, learning.active)} empty="Dati insufficienti." />
      </Card>

      <Card title="🌍 Resa per fascia di destinazione" subtitle="Mete famosissime, molto note o di nicchia.">
        <Table head={GROUP_HEAD} rows={groupRows(insights.byTier, learning.active)} empty="Dati insufficienti." />
      </Card>

      <Card title="✍️ Resa per tipo di titolo" subtitle="Domanda, numero, due punti o frase evocativa: quale attira più lettori.">
        <Table head={GROUP_HEAD} rows={groupRows(insights.byTitleStyle, learning.active)} empty="Dati insufficienti." />
      </Card>

      <Card
        title="📱 Post promozionali (solo social)"
        subtitle="Visite portate da ciascun argomento grazie ai link tracciati; gli argomenti più efficaci escono più spesso."
      >
        <Table
          head={["Argomento", "Post usciti", "Visite portate", "Coinvolte", "Resa vs media"]}
          rows={insights.promoAngles.map((p) => [
            <span key="l" className="font-semibold text-gray-900">
              {p.label}
            </span>,
            p.posts,
            p.sessions,
            p.engagedSessions,
            <IndexBadge key="i" index={p.index} />,
          ])}
        />
      </Card>

      <div className="grid gap-x-6 md:grid-cols-2">
        <Card title="📣 Da dove arrivano i visitatori">
          <Table
            head={["Canale", "Sessioni", "Coinvolte"]}
            rows={insights.channels.map((c) => [c.channel, c.sessions, c.engagedSessions])}
            empty="Nessun dato sui canali."
          />
        </Card>
        <Card title="📄 Pagine più viste">
          <Table
            head={["Pagina", "Visite", "Lettura media"]}
            rows={insights.topPages.map((p) => [
              <span key="p" className="break-all">
                {p.path}
              </span>,
              p.views,
              p.users > 0 ? fmtDuration(p.avgEngagementSec) : "—",
            ])}
            empty="Nessun dato sulle pagine."
          />
        </Card>
      </div>

      {insights.warnings.length > 0 && (
        <p className="mb-6 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Alcuni dati secondari non sono disponibili: {insights.warnings.join(" · ")}
        </p>
      )}

      <p className="text-center text-xs text-gray-400">
        <Link href={`${base}&refresh=1`} className="underline">
          Aggiorna i dati adesso
        </Link>
      </p>
    </>
  );
}
