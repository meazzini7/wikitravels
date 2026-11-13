/**
 * Runner per GitHub Actions: esegue uno dei job che prima giravano come
 * Vercel Cron (app/api/cron/*), senza passare da Vercel.
 *
 * Uso: tsx --conditions=react-server scripts/run-cron.ts <article|promo|report>
 * (--conditions=react-server serve perché lib/ importa "server-only").
 */

import { generateArticle } from "./generate-article";
import { generatePromoPost } from "./generate-promo-post";
import { sendDailyReportEmail } from "./daily-report";

const jobs: Record<string, () => Promise<unknown>> = {
  article: generateArticle,
  promo: generatePromoPost,
  report: sendDailyReportEmail,
};

async function main() {
  const name = process.argv[2];
  const job = jobs[name];
  if (!job) {
    console.error(`Job sconosciuto "${name}". Validi: ${Object.keys(jobs).join(", ")}`);
    process.exit(2);
  }
  const result = await job();
  console.log(JSON.stringify(result, null, 2));
  // Esce esplicitamente: firebase-admin può lasciare connessioni aperte.
  process.exit(0);
}

main().catch((err) => {
  console.error("Job fallito:", err);
  process.exit(1);
});
