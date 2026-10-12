import Link from "next/link";
import type { ReactNode } from "react";
import { getServiceAccountEmail } from "@/lib/server/ga-data";
import { buildRecommendations, type ArticleStat, type GroupStat, type Insights } from "@/lib/server/performance-insights";
import type { HealthItem } from "@/lib/server/social-health";

// Pensato prima per il telefono: poche cose per volta, numeri grandi, e tutto
// ciò che è lungo sta dentro un "Mostra altro" richiudibile (nessun JavaScript
// lato client: sono semplici <details>).

const TOP_ARTICLES = 5;
const VISIBLE_TIPS = 3;
const VISIBLE_GROUPS = 5;
const VISIBLE_PAGES = 6;

function moreLabel(n: number, one: string, many: string): string {
  return n === 1 ? one : `${many} ${n}`;
}

function fmt(n: number): string {
  return n.toLocaleString("it-IT");
}

function fmtDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function ageLabel(days: number): string {
  if (days < 1) return "oggi";
  if (days < 2) return "ieri";
  if (days < 60) return `${Math.round(days)} giorni fa`;
  return `${Math.round(days / 30)} mesi fa`;
}

const CHANNEL_NAMES: Record<string, string> = {
  "Organic Social": "Social (Facebook, Instagram)",
  "Organic Search": "Google",
  Direct: "Accesso diretto",
  Referral: "Link da altri siti",
  "Paid Social": "Social a pagamento",
  Unassigned: "Non classificato",
};

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/viaggi": "Viaggi della community",
  "/viaggi/nuovo": "Crea un viaggio",
  "/enciclopedia": "Enciclopedia (elenco)",
  "/login": "Accedi",
  "/registrati": "Registrati",
  "/feed": "Feed",
  "/classifica": "Classifica",
  "/info": "Info",
};

export function Card({
  emoji,
  title,
  hint,
  children,
}: {
  emoji: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="card-surface mb-4 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold leading-tight text-gray-900">{title}</h2>
          {hint && <p className="text-sm text-gray-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group mt-3">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-xl bg-gray-50 px-3 text-sm font-bold text-brand-700 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span className="transition group-open:rotate-180" aria-hidden>
          ⌄
        </span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 text-center shadow-soft">
      <p className="font-heading text-3xl font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-brand-700">{label}</p>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function ArticleRow({ a, rank }: { a: ArticleStat; rank?: number }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {rank !== undefined && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-700">
          {rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/enciclopedia/${a.slug}`} className="line-clamp-2 text-sm font-bold text-gray-900 hover:text-brand-700">
          {a.title}
        </Link>
        <p className="truncate text-xs text-gray-500">
          {a.destination} · {ageLabel(a.ageDays)}
          {a.status === "provisional" && " · in corso"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-heading text-lg font-extrabold leading-none text-gray-900">{a.views}</p>
        <p className="text-[11px] text-gray-500">
          {a.views === 1 ? "visita" : "visite"}
          {a.users > 0 && ` · lettura ${fmtDuration(a.avgEngagementSec)}`}
        </p>
      </div>
    </li>
  );
}

// Barra relativa alla media: il segno a metà corsa = "nella media", a destra
// rende più della media. Quando i dati sono pochi i colori restano neutri,
// per non suggerire vincitori che sono solo frutto del caso.
function GroupBars({ groups, active }: { groups: GroupStat[]; active: boolean }) {
  const rows = (items: GroupStat[]) => (
    <ul className="space-y-3">
      {items.map((g) => {
        const pct = Math.max(4, Math.min(100, (g.index / 2) * 100));
        const tone = g.index >= 1.3 ? "bg-green-500" : g.index <= 0.7 ? "bg-gray-300" : "bg-amber-400";
        return (
          <li key={g.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-gray-900">{g.label}</span>
              <span className="shrink-0 text-xs font-bold text-gray-600">{g.index}×</span>
            </div>
            <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
              <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400/70" />
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {g.articles} {g.articles === 1 ? "articolo" : "articoli"} · {g.views} {g.views === 1 ? "visita" : "visite"} nella prima settimana
            </p>
          </li>
        );
      })}
    </ul>
  );

  if (groups.length === 0) return <p className="text-sm text-gray-500">Servono ancora dei dati.</p>;

  // Con pochi dati un moltiplicatore come "7×" è frutto del caso: meglio
  // mostrare solo i conteggi veri, ordinati per visite, senza barre.
  if (!active) {
    const counts = [...groups].sort((a, b) => b.views - a.views || b.articles - a.articles);
    const countRows = (items: GroupStat[]) => (
      <ul className="divide-y divide-gray-100">
        {items.map((g) => (
          <li key={g.key} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{g.label}</p>
              <p className="text-[11px] text-gray-500">
                {g.articles} {g.articles === 1 ? "articolo" : "articoli"}
              </p>
            </div>
            <p className="shrink-0 text-right text-sm">
              <span className="font-bold text-gray-900">{g.views}</span>{" "}
              <span className="text-[11px] text-gray-500">{g.views === 1 ? "visita" : "visite"}</span>
            </p>
          </li>
        ))}
      </ul>
    );
    return (
      <>
        {countRows(counts.slice(0, VISIBLE_GROUPS))}
        {counts.length > VISIBLE_GROUPS && (
          <More label={moreLabel(counts.length - VISIBLE_GROUPS, "Mostra 1 altro", "Mostra altri")}>
            {countRows(counts.slice(VISIBLE_GROUPS))}
          </More>
        )}
      </>
    );
  }

  const shown = groups.slice(0, VISIBLE_GROUPS);
  const rest = groups.slice(VISIBLE_GROUPS);
  return (
    <>
      {rows(shown)}
      {rest.length > 0 && <More label={moreLabel(rest.length, "Mostra 1 altro", "Mostra altri")}>{rows(rest)}</More>}
    </>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-wide text-gray-500 first:mt-0">{children}</h3>;
}

export function HealthSection({
  health,
  gaOk,
  secret,
}: {
  health: HealthItem[];
  gaOk: boolean;
  secret: string;
}) {
  const rows = [
    ...health.map((h) => ({
      key: h.key,
      ok: h.ok,
      label: h.key === "facebook" ? "Facebook" : "Instagram",
      status: h.ok ? "Funziona" : /expired|scadut/i.test(h.detail) ? "Collegamento scaduto: va rinnovato" : "Non funziona",
      detail: h.detail,
      note: h.note,
      action:
        !h.ok && h.key === "instagram"
          ? { href: `/admin/instagram-connect?secret=${encodeURIComponent(secret)}`, label: "Rinnova Instagram" }
          : null,
    })),
    {
      key: "ga",
      ok: gaOk,
      label: "Google Analytics",
      status: gaOk ? "Collegato" : "Da collegare (vedi sotto)",
      detail: "",
      note: undefined as string | undefined,
      action: null,
    },
  ];
  const allOk = rows.every((r) => r.ok);

  return (
    <Card emoji={allOk ? "✅" : "⚠️"} title="Collegamenti" hint={allOk ? "Tutto funziona." : "Qualcosa richiede la tua attenzione."}>
      <ul className="space-y-2">
        {rows.map((r) =>
          r.ok ? (
            <li key={r.key} className="rounded-xl bg-green-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-green-900">✅ {r.label}</p>
                <p className="text-xs text-green-800">{r.status}</p>
              </div>
              {r.note && <p className="mt-0.5 text-[11px] text-green-800">{r.note}</p>}
            </li>
          ) : (
            <li key={r.key} className="rounded-xl bg-red-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-red-900">⚠️ {r.label}</p>
                  <p className="text-xs text-red-800">{r.status}</p>
                  {r.note && <p className="mt-0.5 text-[11px] text-red-800">{r.note}</p>}
                </div>
                {r.action && (
                  <Link
                    href={r.action.href}
                    className="tap-scale flex min-h-[44px] shrink-0 items-center rounded-full bg-red-600 px-4 text-sm font-bold text-white"
                  >
                    {r.action.label}
                  </Link>
                )}
              </div>
              {r.detail && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-red-800 underline">Dettagli tecnici</summary>
                  <p className="mt-1 break-words text-xs text-red-900">{r.detail}</p>
                </details>
              )}
            </li>
          )
        )}
      </ul>
    </Card>
  );
}

export function SetupGuide({ error }: { error: string | undefined }) {
  const email = getServiceAccountEmail();
  // Il "numero progetto" Google Cloud coincide con il messagingSenderId di
  // Firebase: il progetto è lo stesso, quindi si può linkare direttamente
  // la pagina per abilitare l'API senza far cercare nulla nella console.
  const projectNumber = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const enableUrl = projectNumber
    ? `https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=${projectNumber}`
    : null;
  return (
    <Card
      emoji="🔌"
      title="Collega Google Analytics"
      hint="Serve per misurare cosa funziona. Si fa una volta sola (3 passaggi)."
    >
      {error && (
        <p className="mb-3 break-words rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Ultimo errore:</strong> {error}
        </p>
      )}
      <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700">
        <li>
          {enableUrl ? (
            <>
              Apri{" "}
              <a href={enableUrl} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">
                questo link per abilitare la Google Analytics Data API
              </a>{" "}
              (è lo stesso progetto di Firebase: accedi con lo stesso account Google) e clicca il pulsante blu{" "}
              <strong>Abilita</strong>. Poi aspetta un paio di minuti.
            </>
          ) : (
            <>
              Su <strong>console.cloud.google.com</strong>, nel progetto di Firebase: <strong>API e servizi → Libreria</strong> →
              cerca <strong>&quot;Google Analytics Data API&quot;</strong> → <strong>Abilita</strong>.
            </>
          )}
        </li>
        <li>
          Vai su <strong>analytics.google.com</strong> → <strong>Amministrazione</strong> (ingranaggio in basso a sinistra) →{" "}
          <strong>Gestione dell&apos;accesso all&apos;account</strong> → <strong>+</strong> → <strong>Aggiungi utenti</strong> →
          incolla questa email, togli la spunta alla notifica e dai il ruolo <strong>Visualizzatore</strong>:
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

export function DashboardView({ insights }: { insights: Insights }) {
  const { learning, totals } = insights;
  const tips = buildRecommendations(insights);
  const engagedPct = totals.sessions > 0 ? Math.round((totals.engagedSessions / totals.sessions) * 100) : 0;

  const visited = insights.articles.filter((a) => a.views > 0);
  const unseen = insights.articles.filter((a) => a.views === 0 && a.ageDays >= 3);
  const titleBySlug = new Map(insights.articles.map((a) => [a.slug, a.title]));
  const progress = Math.min(100, Math.round((learning.totalViews / learning.minTotalViews) * 100));
  const maxChannel = Math.max(1, ...insights.channels.map((c) => c.sessions));
  const usedAngles = insights.promoAngles.filter((p) => p.posts > 0).sort((a, b) => b.sessions - a.sessions);
  const unusedAngles = insights.promoAngles.filter((p) => p.posts === 0);

  const pageName = (path: string): string => {
    if (PAGE_NAMES[path]) return PAGE_NAMES[path];
    const slug = path.replace(/^\/enciclopedia\//, "");
    return path.startsWith("/enciclopedia/") ? (titleBySlug.get(slug) ?? slug) : path;
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Persone" value={fmt(totals.users)} hint={`ultimi ${insights.windowDays} giorni`} />
        <Kpi label="Visite" value={fmt(totals.sessions)} />
        <Kpi label="Pagine aperte" value={fmt(totals.views)} />
        <Kpi label="Visite vere" value={`${engagedPct}%`} hint="restano più di 10 secondi" />
      </div>

      <Card emoji="🎯" title="Cosa fare adesso" hint="Indicazioni ricavate in automatico dai dati.">
        {tips.length === 0 ? (
          <p className="text-sm text-gray-500">Ancora nessuna indicazione: serve un po&apos; di traffico.</p>
        ) : (
          <>
            <ul className="space-y-2 text-sm text-gray-800">
              {tips.slice(0, VISIBLE_TIPS).map((tip, i) => (
                <li key={i} className="rounded-xl bg-brand-50/60 p-3">
                  {tip}
                </li>
              ))}
            </ul>
            {tips.length > VISIBLE_TIPS && (
              <More label={tips.length - VISIBLE_TIPS === 1 ? "1 altro consiglio" : `Altri ${tips.length - VISIBLE_TIPS} consigli`}>
                <ul className="space-y-2 text-sm text-gray-800">
                  {tips.slice(VISIBLE_TIPS).map((tip, i) => (
                    <li key={i} className="rounded-xl bg-brand-50/60 p-3">
                      {tip}
                    </li>
                  ))}
                </ul>
              </More>
            )}
          </>
        )}
      </Card>

      <Card
        emoji="🧠"
        title="Il sistema impara"
        hint={
          learning.active
            ? "Attivo: articoli e post nuovi vengono orientati verso ciò che rende di più."
            : "In raccolta dati: per ora sceglie come sempre, per non farsi ingannare dal caso."
        }
      >
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="text-gray-700">Visite raccolte per imparare</span>
          <span className="font-bold text-gray-900">
            {fmt(learning.totalViews)} / {fmt(learning.minTotalViews)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
        <More label="Come funziona">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-700">
            <li>
              Ogni articolo prende un punteggio: <strong>visite della prima settimana × tempo di lettura</strong>. Tutti sono
              confrontati sullo stesso periodo, così un articolo nuovo non batte uno vecchio solo perché è fresco.
            </li>
            <li>
              Conta solo chi ha almeno 7 giorni di vita ({learning.matureArticles} articoli per ora). Servono almeno{" "}
              {learning.minMatureArticles} articoli e {learning.minTotalViews} visite per fidarsi dei confronti.
            </li>
            <li>Quando i dati bastano, temi e destinazioni che rendono di più escono più spesso.</li>
            <li>Il 25% delle scelte resta sempre libero, per continuare a provare cose nuove.</li>
          </ul>
        </More>
      </Card>

      <Card emoji="🏆" title="Articoli più visitati" hint="Dal più al meno visitato, negli ultimi 4 mesi.">
        {visited.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun articolo ha ancora ricevuto visite.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {visited.slice(0, TOP_ARTICLES).map((a, i) => (
                <ArticleRow key={a.slug} a={a} rank={i + 1} />
              ))}
            </ul>
            {visited.length > TOP_ARTICLES && (
              <More label={moreLabel(visited.length - TOP_ARTICLES, "Mostra 1 altro", "Mostra altri")}>
                <ul className="divide-y divide-gray-100">
                  {visited.slice(TOP_ARTICLES, 30).map((a, i) => (
                    <ArticleRow key={a.slug} a={a} rank={TOP_ARTICLES + i + 1} />
                  ))}
                </ul>
              </More>
            )}
          </>
        )}
      </Card>

      {unseen.length > 0 && (
        <Card emoji="💤" title="Articoli senza visite">
          <p className="text-sm text-gray-700">
            <span className="font-heading text-2xl font-extrabold text-gray-900">{unseen.length}</span>{" "}
            {unseen.length === 1 ? "articolo non ha" : "articoli non hanno"} ancora ricevuto nemmeno una visita: Google e i social
            non li hanno ancora scoperti.
          </p>
          <More label="Mostra l'elenco">
            <ul className="divide-y divide-gray-100">
              {[...unseen]
                .sort((a, b) => a.ageDays - b.ageDays)
                .slice(0, 40)
                .map((a) => (
                  <li key={a.slug} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/enciclopedia/${a.slug}`} className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                      {a.title}
                    </Link>
                    <span className="shrink-0 text-xs text-gray-500">{ageLabel(a.ageDays)}</span>
                  </li>
                ))}
            </ul>
            {unseen.length > 40 && <p className="mt-2 text-xs text-gray-500">…e altri {unseen.length - 40} più vecchi.</p>}
          </More>
        </Card>
      )}

      <Card
        emoji="🧭"
        title="Cosa funziona di più"
        hint={
          learning.active
            ? "La linea a metà barra è la media: più a destra rende di più."
            : "Numeri solo indicativi finché i dati sono pochi."
        }
      >
        <SubTitle>Per tema di viaggio</SubTitle>
        <GroupBars groups={insights.byVibe} active={learning.active} />
        <SubTitle>Per tipo di destinazione</SubTitle>
        <GroupBars groups={insights.byTier} active={learning.active} />
        <SubTitle>Per tipo di titolo</SubTitle>
        <GroupBars groups={insights.byTitleStyle} active={learning.active} />
      </Card>

      <Card emoji="📱" title="Post promozionali" hint="Visite portate da ciascun argomento (solo post sui social). Il conteggio parte da quando è stato attivato il tracciamento dei link.">
        {usedAngles.length === 0 ? (
          <p className="text-sm text-gray-500">Ancora nessun post promozionale misurato.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {usedAngles.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-500">
                    {p.posts} {p.posts === 1 ? "post uscito" : "post usciti"}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="font-heading text-lg font-extrabold text-gray-900">{p.sessions}</span>{" "}
                  <span className="text-[11px] text-gray-500">{p.sessions === 1 ? "visita" : "visite"}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
        {unusedAngles.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">Non ancora usati: {unusedAngles.map((p) => p.label).join(", ")}.</p>
        )}
      </Card>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Card emoji="📣" title="Da dove arrivano">
          {insights.channels.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun dato sui canali.</p>
          ) : (
            <ul className="space-y-3">
              {insights.channels.map((c) => (
                <li key={c.channel}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-gray-900">
                      {CHANNEL_NAMES[c.channel] ?? c.channel}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-900">{c.sessions}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-brand-200" style={{ width: `${(c.sessions / maxChannel) * 100}%` }}>
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${c.sessions > 0 ? (c.engagedSessions / c.sessions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {c.engagedSessions} su {c.sessions} sono restati davvero
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card emoji="📄" title="Pagine più viste">
          {insights.topPages.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun dato sulle pagine.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {insights.topPages.slice(0, VISIBLE_PAGES).map((p) => (
                  <li key={p.path} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="line-clamp-2 min-w-0 flex-1 font-semibold text-gray-900">{pageName(p.path)}</span>
                    <span className="shrink-0 font-bold text-gray-900">{p.views}</span>
                  </li>
                ))}
              </ul>
              {insights.topPages.length > VISIBLE_PAGES && (
                <More label={moreLabel(insights.topPages.length - VISIBLE_PAGES, "Mostra 1 altra", "Mostra altre")}>
                  <ul className="divide-y divide-gray-100">
                    {insights.topPages.slice(VISIBLE_PAGES).map((p) => (
                      <li key={p.path} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="line-clamp-2 min-w-0 flex-1 text-gray-900">{pageName(p.path)}</span>
                        <span className="shrink-0 font-bold text-gray-900">{p.views}</span>
                      </li>
                    ))}
                  </ul>
                </More>
              )}
            </>
          )}
        </Card>
      </div>

      {insights.warnings.length > 0 && (
        <p className="mb-4 break-words rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Alcuni dati secondari non sono disponibili: {insights.warnings.join(" · ")}
        </p>
      )}
    </>
  );
}
