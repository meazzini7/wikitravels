import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Le pagine /admin sono protette dallo stesso CRON_SECRET dei cron (nessun
// sistema di login separato da gestire): il segreto si passa come
// ?secret=... nell'indirizzo. Confronto a tempo costante.
export function isValidAdminSecret(provided: string | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

// Parametro "state" del flusso OAuth di Instagram: derivato dal segreto, così
// la pagina di ritorno accetta solo richieste partite dalla pagina protetta
// /admin/instagram-connect e nessuno può "iniettare" un proprio collegamento
// costruendo a mano un indirizzo di ritorno.
export function makeOAuthState(): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("instagram-oauth-state-v1").digest("hex");
}

export function isValidOAuthState(provided: string | null | undefined): boolean {
  const expected = makeOAuthState();
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}
