import "server-only";
import { timingSafeEqual } from "crypto";

// Le pagine /admin sono protette dallo stesso CRON_SECRET dei cron (nessun
// sistema di login separato da gestire): il segreto si passa come
// ?secret=... nell'indirizzo. Confronto a tempo costante.
export function isValidAdminSecret(provided: string | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
