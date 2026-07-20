import { getAdminDb } from "../lib/firebase-admin";

const DAY_MS = 24 * 60 * 60 * 1000;

interface PeriodStats {
  newUsers: number;
  newTrips: number;
  km: number;
}

interface ReportData {
  today: PeriodStats;
  yesterday: PeriodStats;
  last7d: PeriodStats;
  prev7d: PeriodStats;
  totals: { users: number; trips: number; km: number };
}

function countInRange(timestamps: number[], from: number, to: number): number {
  return timestamps.filter((t) => t >= from && t < to).length;
}

function sumInRange(items: { createdAt: number; km: number }[], from: number, to: number): number {
  return items
    .filter((i) => i.createdAt >= from && i.createdAt < to)
    .reduce((sum, i) => sum + i.km, 0);
}

export async function computeDailyReport(): Promise<ReportData> {
  const db = getAdminDb();
  const now = Date.now();
  const todayStart = Math.floor(now / DAY_MS) * DAY_MS;
  const yesterdayStart = todayStart - DAY_MS;
  const last7Start = todayStart - 7 * DAY_MS;
  const prev7Start = todayStart - 14 * DAY_MS;

  const [usersSnap, tripsSnap] = await Promise.all([
    db.collection("users").select("createdAt").get(),
    db.collection("trips").where("status", "==", "published").select("createdAt", "totalDistanceKm").get(),
  ]);

  const userTimestamps = usersSnap.docs.map((d) => Number(d.data().createdAt ?? 0));
  const trips = tripsSnap.docs.map((d) => ({
    createdAt: Number(d.data().createdAt ?? 0),
    km: Number(d.data().totalDistanceKm ?? 0),
  }));
  const tripTimestamps = trips.map((t) => t.createdAt);

  return {
    today: {
      newUsers: countInRange(userTimestamps, todayStart, now + DAY_MS),
      newTrips: countInRange(tripTimestamps, todayStart, now + DAY_MS),
      km: sumInRange(trips, todayStart, now + DAY_MS),
    },
    yesterday: {
      newUsers: countInRange(userTimestamps, yesterdayStart, todayStart),
      newTrips: countInRange(tripTimestamps, yesterdayStart, todayStart),
      km: sumInRange(trips, yesterdayStart, todayStart),
    },
    last7d: {
      newUsers: countInRange(userTimestamps, last7Start, now + DAY_MS),
      newTrips: countInRange(tripTimestamps, last7Start, now + DAY_MS),
      km: sumInRange(trips, last7Start, now + DAY_MS),
    },
    prev7d: {
      newUsers: countInRange(userTimestamps, prev7Start, last7Start),
      newTrips: countInRange(tripTimestamps, prev7Start, last7Start),
      km: sumInRange(trips, prev7Start, last7Start),
    },
    totals: {
      users: userTimestamps.length,
      trips: tripTimestamps.length,
      km: trips.reduce((sum, t) => sum + t.km, 0),
    },
  };
}

function row(label: string, today: number, yesterday: number, last7d: number, prev7d: number): string {
  return `<tr>
    <td style="padding:6px 12px;border-bottom:1px solid #eee;">${label}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${today}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${yesterday}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${last7d}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${prev7d}</td>
  </tr>`;
}

export function renderReportHtml(data: ReportData): string {
  const dateLabel = new Date().toISOString().slice(0, 10);
  return `<div style="font-family:sans-serif;color:#111;max-width:520px;">
    <h2 style="color:#dd2166;">WikiTravels — report giornaliero (${dateLabel})</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:6px 12px;text-align:left;">Metrica</th>
          <th style="padding:6px 12px;text-align:right;">Oggi</th>
          <th style="padding:6px 12px;text-align:right;">Ieri</th>
          <th style="padding:6px 12px;text-align:right;">Ultimi 7gg</th>
          <th style="padding:6px 12px;text-align:right;">7gg precedenti</th>
        </tr>
      </thead>
      <tbody>
        ${row("Nuovi utenti", data.today.newUsers, data.yesterday.newUsers, data.last7d.newUsers, data.prev7d.newUsers)}
        ${row("Nuovi viaggi", data.today.newTrips, data.yesterday.newTrips, data.last7d.newTrips, data.prev7d.newTrips)}
        ${row("Km registrati", Math.round(data.today.km), Math.round(data.yesterday.km), Math.round(data.last7d.km), Math.round(data.prev7d.km))}
      </tbody>
    </table>
    <p style="margin-top:16px;font-size:13px;color:#555;">
      Totali di sempre: <strong>${data.totals.users}</strong> utenti · <strong>${data.totals.trips}</strong> viaggi ·
      <strong>${Math.round(data.totals.km)}</strong> km
    </p>
  </div>`;
}

export async function sendDailyReportEmail() {
  const data = await computeDailyReport();
  const html = renderReportHtml(data);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_REPORT_EMAIL;
  if (!apiKey || !to) {
    console.error(
      "RESEND_API_KEY o ADMIN_REPORT_EMAIL non configurate: report calcolato ma non inviato."
    );
    return { sent: false, data };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "WikiTravels <onboarding@resend.dev>",
      to,
      subject: `WikiTravels — report giornaliero (${new Date().toISOString().slice(0, 10)})`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Invio report fallito:", await res.text());
    return { sent: false, data };
  }
  return { sent: true, data };
}
