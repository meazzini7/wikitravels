import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

// Legge la lingua scelta dal middleware (rilevata dal dispositivo o
// impostata manualmente dall'utente) per i Server Component, che non
// possono usare il contesto React del client.
export function getServerLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
