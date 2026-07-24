import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./lib/i18n/config";

// Sceglie la lingua preferita dall'header Accept-Language (che il browser
// del visitatore invia in base alla lingua del dispositivo), rispettando
// l'ordine di preferenza dei valori "q". Es. "en-US,en;q=0.9,it;q=0.8" ->
// prova "en-us" (non supportato), poi la sua base "en" (supportata) -> "en".
function pickLocaleFromHeader(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;
  const parsed = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    if (isLocale(tag)) return tag;
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(LOCALE_COOKIE)?.value;
  if (existing && isLocale(existing)) return NextResponse.next();

  // Prima visita (nessuna preferenza salvata): rileva dal dispositivo e
  // ricorda la scelta, così le richieste successive non la ridetectano ad
  // ogni volta e un eventuale cambio manuale resta stabile.
  const detected = pickLocaleFromHeader(req.headers.get("accept-language"));
  const res = NextResponse.next();
  res.cookies.set(LOCALE_COOKIE, detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
