/**
 * Runner per GitHub Actions: esegue uno dei job che prima giravano come
 * Vercel Cron (app/api/cron/*), senza passare da Vercel.
 *
 * Uso: tsx --conditions=react-server scripts/run-cron.ts <article|promo|report>
 * (--conditions=react-server serve perché lib/ importa "server-only").
 *
 * Il repository è pubblico, quindi anche i log della Action lo sono: qui si
 * stampa solo l'esito (titolo e indirizzo di un articolo sono già pubblici),
 * mai i dati del report né valori di variabili d'ambiente.
 *
 * Codice di uscita: 0 = tutto riuscito; 1 = qualcosa non è andato (il job
 * risulta "failed" in Actions e GitHub manda l'email di avviso); 2 = job
 * sconosciuto. Un fallimento dei social NON annulla l'articolo, che a quel
 * punto è già online: il job però risulta fallito, così si nota subito (per
 * esempio un token Instagram scaduto) invece di restare un errore nascosto
 * nel testo del log.
 */

import { appendFileSync } from "node:fs";
import { generateArticle } from "./generate-article";
import { generatePromoPost } from "./generate-promo-post";
import { sendDailyReportEmail } from "./daily-report";

type SocialResult = { ok: boolean; error?: string };
type SocialOutcome = { facebook?: SocialResult; instagram?: SocialResult };
type Outcome = { ok: boolean; summary: string; failures: string[] };

const MAX_ERROR_LENGTH = 300;

function socialFailures(social: SocialOutcome | undefined): string[] {
  if (!social) return [];
  return (["facebook", "instagram"] as const)
    .filter((channel) => social[channel] && !social[channel]?.ok)
    .map((channel) => `${channel}: ${String(social[channel]?.error ?? "errore sconosciuto").slice(0, MAX_ERROR_LENGTH)}`);
}

async function runArticle(): Promise<Outcome> {
  const result = await generateArticle();
  if (!result) {
    return { ok: true, summary: "Nessun nuovo articolo: l'indirizzo scelto esisteva già, riproverà alla prossima corsa.", failures: [] };
  }
  const failures = socialFailures(result.social);
  return {
    ok: failures.length === 0,
    summary: `Articolo pubblicato: "${result.title}" (/enciclopedia/${result.slug}). Facebook: ${
      result.social.facebook.ok ? "ok" : "NO"
    }, Instagram: ${result.social.instagram.ok ? "ok" : "NO"}.`,
    failures,
  };
}

async function runPromo(): Promise<Outcome> {
  const result = await generatePromoPost();
  const failures = socialFailures(result.social);
  return {
    ok: failures.length === 0,
    summary: `Post promozionale "${result.angle}". Facebook: ${result.social.facebook.ok ? "ok" : "NO"}, Instagram: ${
      result.social.instagram.ok ? "ok" : "NO"
    }.`,
    failures,
  };
}

async function runReport(): Promise<Outcome> {
  const result = await sendDailyReportEmail();
  return result.sent
    ? { ok: true, summary: "Report giornaliero inviato.", failures: [] }
    : {
        ok: false,
        summary: "Report giornaliero NON inviato.",
        failures: ["email: controlla ADMIN_REPORT_EMAIL, RESEND_API_KEY e RESEND_FROM_EMAIL tra i secrets di GitHub"],
      };
}

const jobs: Record<string, () => Promise<Outcome>> = {
  article: runArticle,
  promo: runPromo,
  report: runReport,
};

// Annotazioni di GitHub Actions: compaiono in evidenza nella pagina della
// corsa. I caratteri speciali vanno protetti, altrimenti spezzano il comando.
function annotate(level: "error" | "warning", message: string) {
  if (!process.env.GITHUB_ACTIONS) return;
  const safe = message.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  console.log(`::${level}::${safe}`);
}

// Riepilogo mostrato in cima alla pagina della corsa, senza aprire il log.
function writeStepSummary(name: string, outcome: Outcome) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const lines = [`### ${outcome.ok ? "✅" : "❌"} ${name}`, "", outcome.summary];
  if (outcome.failures.length > 0) lines.push("", ...outcome.failures.map((f) => `- ${f}`));
  appendFileSync(file, `${lines.join("\n")}\n`);
}

async function main() {
  const name = process.argv[2];
  const job = jobs[name];
  if (!job) {
    console.error(`Job sconosciuto "${name}". Validi: ${Object.keys(jobs).join(", ")}`);
    process.exit(2);
  }

  const outcome = await job();
  console.log(`${outcome.ok ? "✅" : "❌"} [${name}] ${outcome.summary}`);
  for (const failure of outcome.failures) {
    console.error(`   - ${failure}`);
    annotate("error", `[${name}] ${failure}`);
  }
  writeStepSummary(name, outcome);

  // Esce esplicitamente: firebase-admin può lasciare connessioni aperte.
  process.exit(outcome.ok ? 0 : 1);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Job fallito:", message);
  annotate("error", `[${process.argv[2]}] Job fallito: ${message.slice(0, MAX_ERROR_LENGTH)}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ❌ ${process.argv[2]}\n\nJob fallito: ${message.slice(0, MAX_ERROR_LENGTH)}\n`);
  }
  process.exit(1);
});
