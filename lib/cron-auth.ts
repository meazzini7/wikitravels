import "server-only";
import type { NextRequest } from "next/server";

// Vercel Cron chiama gli endpoint con l'header Authorization; il parametro
// ?secret= in query string è un fallback pensato per poter far partire un
// cron manualmente visitando l'URL dal browser (utile su piani Vercel senza
// un pulsante "Run" nella dashboard Cron Jobs).
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  return authHeader === `Bearer ${expected}` || querySecret === expected;
}
