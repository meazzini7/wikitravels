import "server-only";
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "../firebase-admin";
import { PROMO_ANGLES, PROMO_CAMPAIGN_PREFIX } from "../promo-angles";
import { isGaConfigured, runGaReport, type GaReportRow } from "./ga-data";

// Il "cervello" che chiude il cerchio: legge cosa fanno davvero i visitatori
// (Google Analytics), lo incrocia con gli articoli in Firestore, assegna un
// punteggio di resa e ne ricava pesi con cui il generatore sceglie temi e
// argomenti. Alimenta anche il pannello /admin/dashboard.

export const WINDOW_DAYS = 28;
// Un articolo appena uscito non ha ancora avuto il tempo di raccogliere
// visite: prima di questa età non entra nelle medie (né nel bene né nel male).
const MATURE_AFTER_DAYS = 3;
// Con poche visite i numeri sono rumore: il sistema comincia a orientare la
// generazione solo oltre queste soglie, prima sceglie come ha sempre fatto.
const MIN_MATURE_ARTICLES = 6;
const MIN_TOTAL_VIEWS = 25;
const MIN_PROMO_SESSIONS = 10;
// "Peso" del dato medio generale nel ridimensionare le medie di gruppi con
// pochi articoli: un tema con 1 solo articolo fortunato non deve vincere.
const PRIOR_STRENGTH = 3;
const WEIGHT_MIN = 0.4;
const WEIGHT_MAX = 2.5;
// Quota di scelte fatte comunque "alla cieca" per continuare a esplorare
// temi che oggi sembrano deboli ma potrebbero sorprendere.
export const EXPLORE_PROBABILITY = 0.25;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ArticleStat {
  slug: string;
  title: string;
  destination: string;
  vibe: string;
  tier: number;
  titleStyle: string;
  ageDays: number;
  views: number;
  users: number;
  sessions: number;
  engagedSessions: number;
  avgEngagementSec: number;
  score: number;
}

export interface GroupStat {
  key: string;
  label: string;
  articles: number;
  views: number;
  avgScore: number;
  index: number;
  weight: number;
}

export interface PromoAngleStat {
  key: string;
  label: string;
  posts: number;
  sessions: number;
  engagedSessions: number;
  index: number;
  weight: number;
}

export interface ChannelStat {
  channel: string;
  sessions: number;
  engagedSessions: number;
  users: number;
}

export interface PageStat {
  path: string;
  views: number;
  users: number;
  avgEngagementSec: number;
}

export interface Insights {
  generatedAt: number;
  windowDays: number;
  totals: { users: number; sessions: number; views: number; engagedSessions: number };
  articles: ArticleStat[];
  byVibe: GroupStat[];
  byTier: GroupStat[];
  byTitleStyle: GroupStat[];
  promoAngles: PromoAngleStat[];
  channels: ChannelStat[];
  topPages: PageStat[];
  learning: {
    active: boolean;
    matureArticles: number;
    totalViews: number;
    minMatureArticles: number;
    minTotalViews: number;
  };
  warnings: string[];
}

export interface InsightsResult {
  insights: Insights | null;
  source: "fresh" | "cache" | "stale" | "unavailable";
  error?: string;
}

const TIER_LABELS: Record<number, string> = {
  1: "Mete famosissime (fascia 1)",
  2: "Mete molto note (fascia 2)",
  3: "Mete di nicchia (fascia 3)",
};

export function titleStyle(title: string): string {
  if (/\?/.test(title)) return "Titolo a domanda";
  if (/\d/.test(title)) return "Titolo con numero";
  if (/:/.test(title)) return "Titolo con due punti";
  return "Titolo narrativo/evocativo";
}

function toMillis(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

// Media del punteggio di un gruppo "ridimensionata" verso la media generale
// quando il gruppo ha pochi articoli, trasformata in un indice relativo
// (1 = nella media, 2 = rende il doppio) e in un peso per la scelta casuale.
function buildGroups(
  mature: ArticleStat[],
  keyOf: (a: ArticleStat) => string,
  labelOf: (key: string) => string,
  globalMean: number
): GroupStat[] {
  const buckets = new Map<string, ArticleStat[]>();
  for (const a of mature) {
    const key = keyOf(a);
    buckets.set(key, [...(buckets.get(key) ?? []), a]);
  }
  return [...buckets.entries()]
    .map(([key, items]) => {
      const n = items.length;
      const mean = items.reduce((sum, a) => sum + a.score, 0) / n;
      const shrunk = (n * mean + PRIOR_STRENGTH * globalMean) / (n + PRIOR_STRENGTH);
      const index = globalMean > 0 ? shrunk / globalMean : 1;
      return {
        key,
        label: labelOf(key),
        articles: n,
        views: items.reduce((sum, a) => sum + a.views, 0),
        avgScore: round(mean),
        index: round(index),
        weight: round(clamp(index, WEIGHT_MIN, WEIGHT_MAX)),
      };
    })
    .sort((a, b) => b.index - a.index);
}

function sumAt(rows: GaReportRow[], i: number): number {
  return rows.reduce((sum, r) => sum + (r.metrics[i] ?? 0), 0);
}

async function computeInsights(): Promise<Insights> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_DAYS * DAY_MS);
  const dateRanges = [{ startDate: `${WINDOW_DAYS}daysAgo`, endDate: "today" }];
  const warnings: string[] = [];

  const db = getAdminDb();
  const [articlesSnap, promoSnap] = await Promise.all([
    db
      .collection("articles")
      .where("status", "==", "published")
      .select("title", "destination", "vibe", "tier", "createdAt")
      .get(),
    db.collection("promoPosts").where("createdAt", ">=", windowStart).select("angle").get(),
  ]);

  // Un'unica richiesta fallita (es. una metrica non disponibile) non deve
  // far perdere tutto il resto: solo i dati sugli articoli sono vitali.
  const [pagesR, totalsR, channelsR, campaignsR, topPagesR] = await Promise.allSettled([
    runGaReport({
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "engagedSessions" },
        { name: "userEngagementDuration" },
      ],
      dimensionFilter: {
        filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/enciclopedia/" } },
      },
      limit: 1000,
    }),
    runGaReport({
      dateRanges,
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "engagedSessions" },
      ],
    }),
    runGaReport({
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 15,
    }),
    runGaReport({
      dateRanges,
      dimensions: [{ name: "sessionCampaignName" }],
      metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "activeUsers" }],
      dimensionFilter: {
        filter: {
          fieldName: "sessionCampaignName",
          stringFilter: { matchType: "BEGINS_WITH", value: PROMO_CAMPAIGN_PREFIX },
        },
      },
      limit: 100,
    }),
    runGaReport({
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "userEngagementDuration" }],
      dimensionFilter: {
        notExpression: {
          filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/admin" } },
        },
      },
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    }),
  ]);

  if (pagesR.status === "rejected") throw pagesR.reason;

  const optional = <T>(r: PromiseSettledResult<T>, name: string, fallback: T): T => {
    if (r.status === "fulfilled") return r.value;
    warnings.push(`${name}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    return fallback;
  };

  return buildInsights({
    now,
    articles: articlesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title,
        destination: data.destination,
        vibe: data.vibe,
        tier: data.tier,
        createdAtMs: toMillis(data.createdAt),
      };
    }),
    promoPostAngles: promoSnap.docs.map((d) => String(d.data().angle ?? "")),
    pageRows: pagesR.value,
    totalsRows: optional(totalsR, "Totali", [] as GaReportRow[]),
    channelRows: optional(channelsR, "Canali", [] as GaReportRow[]),
    campaignRows: optional(campaignsR, "Campagne social", [] as GaReportRow[]),
    topPageRows: optional(topPagesR, "Pagine più viste", [] as GaReportRow[]),
    warnings,
  });
}

// Parte pura del calcolo (nessuna chiamata di rete): trasforma i dati grezzi
// di Analytics e Firestore in punteggi, indici e pesi. Separata per poterla
// verificare con dati di prova.
export interface InsightsInputs {
  now: number;
  articles: {
    id: string;
    title?: unknown;
    destination?: unknown;
    vibe?: unknown;
    tier?: unknown;
    createdAtMs: number | null;
  }[];
  promoPostAngles: string[];
  pageRows: GaReportRow[];
  totalsRows: GaReportRow[];
  channelRows: GaReportRow[];
  campaignRows: GaReportRow[];
  topPageRows: GaReportRow[];
  warnings: string[];
}

export function buildInsights(input: InsightsInputs): Insights {
  const { now, totalsRows, channelRows, campaignRows, topPageRows, warnings } = input;

  // --- Articoli: dati GA (per slug) incrociati con i documenti Firestore.
  const gaBySlug = new Map<string, number[]>();
  for (const row of input.pageRows) {
    const slug = row.dimensions[0].replace(/^\/enciclopedia\//, "").replace(/[/?#].*$/, "");
    if (!slug) continue;
    const acc = gaBySlug.get(slug) ?? [0, 0, 0, 0, 0];
    row.metrics.forEach((m, i) => {
      acc[i] = (acc[i] ?? 0) + m;
    });
    gaBySlug.set(slug, acc);
  }

  const articles: ArticleStat[] = input.articles.map((doc) => {
    const ageDays = doc.createdAtMs ? Math.max(0, (now - doc.createdAtMs) / DAY_MS) : WINDOW_DAYS;
    const [views, users, sessions, engagedSessions, engagementSeconds] = gaBySlug.get(doc.id) ?? [0, 0, 0, 0, 0];
    // Normalizzato per i giorni di "esposizione": un articolo vecchio ha
    // avuto più tempo per accumulare visite di uno uscito ieri.
    const exposureDays = clamp(ageDays, MATURE_AFTER_DAYS, WINDOW_DAYS);
    const avgEngagementSec = users > 0 ? engagementSeconds / users : 0;
    // Punteggio di resa: traffico giornaliero x profondità di lettura. È un
    // buon indicatore di quanto un contenuto farebbe rendere la pubblicità
    // (più persone che restano più a lungo = più impressioni utili).
    const score = (views / exposureDays) * (1 + Math.min(avgEngagementSec, 180) / 60);
    const title = String(doc.title ?? doc.id);
    return {
      slug: doc.id,
      title,
      destination: String(doc.destination ?? ""),
      vibe: String(doc.vibe ?? ""),
      tier: Number(doc.tier ?? 0),
      titleStyle: titleStyle(title),
      ageDays: round(ageDays, 1),
      views,
      users,
      sessions,
      engagedSessions,
      avgEngagementSec: round(avgEngagementSec, 1),
      score: round(score),
    };
  });
  articles.sort((a, b) => b.score - a.score);

  const mature = articles.filter((a) => a.ageDays >= MATURE_AFTER_DAYS);
  const matureViews = mature.reduce((sum, a) => sum + a.views, 0);
  const globalMean = mature.length > 0 ? mature.reduce((sum, a) => sum + a.score, 0) / mature.length : 0;

  const byVibe = buildGroups(mature, (a) => a.vibe || "(senza tema)", (k) => k, globalMean);
  const byTier = buildGroups(mature, (a) => String(a.tier), (k) => TIER_LABELS[Number(k)] ?? `Fascia ${k}`, globalMean);
  const byTitleStyle = buildGroups(mature, (a) => a.titleStyle, (k) => k, globalMean);

  // --- Post promozionali: sessioni portate da ciascun argomento / numero di post.
  const postsByAngle = new Map<string, number>();
  for (const key of input.promoPostAngles) {
    postsByAngle.set(key, (postsByAngle.get(key) ?? 0) + 1);
  }
  const campaignByKey = new Map<string, number[]>();
  for (const row of campaignRows) {
    campaignByKey.set(row.dimensions[0].replace(PROMO_CAMPAIGN_PREFIX, ""), row.metrics);
  }
  const totalPromoSessions = [...campaignByKey.values()].reduce((sum, m) => sum + (m[0] ?? 0), 0);
  const totalPromoPosts = [...postsByAngle.values()].reduce((sum, n) => sum + n, 0);
  const promoMean = totalPromoPosts > 0 ? totalPromoSessions / totalPromoPosts : 0;
  const promoAngles: PromoAngleStat[] = PROMO_ANGLES.map((angle) => {
    const posts = postsByAngle.get(angle.key) ?? 0;
    const metrics = campaignByKey.get(angle.key) ?? [0, 0, 0];
    const sessions = metrics[0] ?? 0;
    const hasData = totalPromoSessions >= MIN_PROMO_SESSIONS && posts > 0 && promoMean > 0;
    const shrunk = (sessions + PRIOR_STRENGTH * promoMean) / (posts + PRIOR_STRENGTH);
    const index = hasData ? shrunk / promoMean : 1;
    return {
      key: angle.key,
      label: angle.label,
      posts,
      sessions,
      engagedSessions: metrics[1] ?? 0,
      index: round(index),
      weight: round(clamp(index, WEIGHT_MIN, WEIGHT_MAX)),
    };
  }).sort((a, b) => b.index - a.index);

  return {
    generatedAt: now,
    windowDays: WINDOW_DAYS,
    totals: {
      users: sumAt(totalsRows, 0),
      sessions: sumAt(totalsRows, 1),
      views: sumAt(totalsRows, 2),
      engagedSessions: sumAt(totalsRows, 3),
    },
    articles,
    byVibe,
    byTier,
    byTitleStyle,
    promoAngles,
    channels: channelRows.map((r) => ({
      channel: r.dimensions[0],
      sessions: r.metrics[0] ?? 0,
      engagedSessions: r.metrics[1] ?? 0,
      users: r.metrics[2] ?? 0,
    })),
    topPages: topPageRows.map((r) => ({
      path: r.dimensions[0],
      views: r.metrics[0] ?? 0,
      users: r.metrics[1] ?? 0,
      avgEngagementSec: r.metrics[1] ? round((r.metrics[2] ?? 0) / r.metrics[1], 1) : 0,
    })),
    learning: {
      active: mature.length >= MIN_MATURE_ARTICLES && matureViews >= MIN_TOTAL_VIEWS,
      matureArticles: mature.length,
      totalViews: matureViews,
      minMatureArticles: MIN_MATURE_ARTICLES,
      minTotalViews: MIN_TOTAL_VIEWS,
    },
    warnings,
  };
}

// Dati con cache in Firestore (12 ore): il pannello e il generatore non
// devono interrogare Google Analytics a ogni richiesta, e se GA ha un
// problema si usa l'ultimo snapshot valido invece di restare senza dati.
export async function getInsights(options: { force?: boolean } = {}): Promise<InsightsResult> {
  // Tutto ciò che tocca Firestore è protetto: un problema di credenziali o di
  // rete non deve mai far crollare il pannello né il generatore, solo
  // restituire "dati non disponibili" con il motivo.
  let ref: DocumentReference | null = null;
  let cached: Insights | null = null;
  try {
    ref = getAdminDb().collection("analytics").doc("insights");
    const snap = await ref.get();
    if (snap.exists) cached = snap.data() as Insights;
  } catch (err) {
    console.error("Impossibile leggere lo snapshot degli insight:", err);
  }

  if (!options.force && cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return { insights: cached, source: "cache" };
  }

  if (!isGaConfigured()) {
    return {
      insights: cached,
      source: cached ? "stale" : "unavailable",
      error: "GA4_PROPERTY_ID non configurata su Vercel.",
    };
  }

  try {
    const fresh = await computeInsights();
    try {
      // JSON round-trip: Firestore rifiuta i campi "undefined".
      await ref?.set(JSON.parse(JSON.stringify(fresh)));
    } catch (err) {
      console.error("Snapshot degli insight non salvato (i dati restano validi):", err);
    }
    return { insights: fresh, source: "fresh" };
  } catch (err) {
    console.error("Impossibile calcolare gli insight da Google Analytics:", err);
    return {
      insights: cached,
      source: cached ? "stale" : "unavailable",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Per i generatori: restituisce gli insight SOLO se i dati sono abbastanza
// per fidarsene, altrimenti null (= scegliere come prima, senza orientamento).
export async function getLearningInsights(): Promise<Insights | null> {
  try {
    const { insights } = await getInsights();
    return insights?.learning.active ? insights : null;
  } catch (err) {
    console.error("Insight non disponibili, il generatore sceglie senza orientamento:", err);
    return null;
  }
}

// --- Scelta pesata per i generatori ---

export function shouldExplore(): boolean {
  return Math.random() < EXPLORE_PROBABILITY;
}

export function pickWeighted<T>(items: T[], weightOf: (item: T) => number): T {
  const weights = items.map((i) => Math.max(0, weightOf(i)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function weightFor(groups: GroupStat[] | PromoAngleStat[] | undefined, key: string): number {
  return groups?.find((g) => g.key === key)?.weight ?? 1;
}

// Articoli di esempio per il prompt: i più riusciti e i meno riusciti tra
// quelli con abbastanza storia (almeno una settimana) per giudicarli.
export function pickExamples(insights: Insights, count = 3): { best: ArticleStat[]; weakest: ArticleStat[] } {
  const judged = insights.articles.filter((a) => a.ageDays >= 7);
  const best = judged.filter((a) => a.score > 0).slice(0, count);
  const bestSlugs = new Set(best.map((a) => a.slug));
  const weakest = [...judged]
    .reverse()
    .filter((a) => !bestSlugs.has(a.slug))
    .slice(0, count);
  return { best, weakest };
}

// --- Consigli "dove spingere", in italiano semplice, per il pannello ---

export function buildRecommendations(insights: Insights): string[] {
  const tips: string[] = [];
  const mature = insights.articles.filter((a) => a.ageDays >= MATURE_AFTER_DAYS);
  const { learning } = insights;

  if (!learning.active) {
    tips.push(
      `🌱 Dati ancora pochi (${learning.matureArticles} articoli maturi, ${learning.totalViews} visite negli ultimi ${insights.windowDays} giorni): ` +
        `il sistema comincerà a orientare la generazione dopo almeno ${learning.minMatureArticles} articoli e ${learning.minTotalViews} visite. ` +
        `Fino ad allora sceglie come ha sempre fatto — più traffico porti dai social, prima impara.`
    );
  }

  const bestVibe = insights.byVibe.find((g) => g.articles >= 2 && g.index >= 1.3);
  if (bestVibe) {
    tips.push(
      `🔥 I temi "${bestVibe.label}" rendono ${bestVibe.index}× la media: il generatore li sceglierà più spesso. ` +
        `Rilancia sui social gli articoli già pubblicati su questo tema.`
    );
  }
  const worstVibe = [...insights.byVibe].reverse().find((g) => g.articles >= 2 && g.index <= 0.7);
  if (worstVibe) {
    tips.push(`❄️ I temi "${worstVibe.label}" rendono solo ${worstVibe.index}× la media: verranno scelti meno spesso.`);
  }

  const bestTier = insights.byTier.find((g) => g.articles >= 2 && g.index >= 1.3);
  if (bestTier) {
    tips.push(`🎯 Le "${bestTier.label}" funzionano meglio delle altre (${bestTier.index}× la media).`);
  }

  const bestStyle = insights.byTitleStyle.find((g) => g.articles >= 2 && g.index >= 1.3);
  if (bestStyle) {
    tips.push(`✍️ Tipo di titolo vincente finora: "${bestStyle.label}" (${bestStyle.index}× la media).`);
  }

  const top = insights.articles[0];
  if (top && top.views > 0) {
    tips.push(
      `🏆 Articolo più forte: "${top.title}" (${top.views} visite, ${Math.round(top.avgEngagementSec)}s di lettura media). ` +
        `Condividilo di nuovo e collegalo dagli altri articoli della stessa destinazione.`
    );
  }

  // Si leggono molto ma si vedono poco: contenuto buono, serve solo visibilità.
  const median = [...mature].map((a) => a.views).sort((a, b) => a - b)[Math.floor(mature.length / 2)] ?? 0;
  const hiddenGems = mature.filter((a) => a.users >= 2 && a.avgEngagementSec >= 45 && a.views <= median).slice(0, 3);
  if (hiddenGems.length > 0) {
    tips.push(
      `💎 Pochi li aprono ma chi arriva legge a lungo: ${hiddenGems.map((a) => `"${a.title}"`).join(", ")}. ` +
        `Sono gemme da spingere di più sui social.`
    );
  }

  // Si aprono ma si abbandonano subito: il titolo promette più del contenuto.
  const bounced = mature.filter((a) => a.views >= 5 && a.avgEngagementSec < 15).slice(0, 3);
  if (bounced.length > 0) {
    tips.push(
      `🚪 Molti li aprono ma se ne vanno subito: ${bounced.map((a) => `"${a.title}"`).join(", ")}. ` +
        `Probabile titolo che promette più di quanto il testo mantenga.`
    );
  }

  const unseen = mature.filter((a) => a.ageDays >= 14 && a.views === 0);
  if (unseen.length > 0) {
    tips.push(
      `👻 ${unseen.length} ${unseen.length === 1 ? "articolo con almeno 2 settimane di vita non ha" : "articoli con almeno 2 settimane di vita non hanno"} avuto nemmeno una visita: ` +
        `non ${unseen.length === 1 ? "è ancora stato intercettato" : "sono ancora stati intercettati"} da Google né dai social.`
    );
  }

  const bestChannel = insights.channels.filter((c) => c.engagedSessions > 0)[0];
  if (bestChannel) {
    tips.push(
      `📣 Il canale che oggi porta più visitatori è "${bestChannel.channel}" ` +
        `(${bestChannel.sessions} sessioni, ${bestChannel.engagedSessions} davvero coinvolte).`
    );
  }

  const bestAngle = insights.promoAngles.find((a) => a.posts > 0 && a.sessions > 0 && a.index >= 1.3);
  if (bestAngle) {
    tips.push(
      `📱 Tra i post promozionali, "${bestAngle.label}" porta più visitatori della media (${bestAngle.index}×): ` +
        `uscirà più spesso.`
    );
  }

  return tips;
}
