export const SUPPORTED_LOCALES = ["it", "en", "es", "fr", "de", "pt"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "it";

export const LOCALE_LABELS: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
};

// Nome della lingua nel proprio idioma, da passare a Gemini quando si
// traduce un articolo: "in inglese" comunica meno bene di "in English".
export const LOCALE_GEMINI_NAME: Record<Locale, string> = {
  it: "italiano",
  en: "English",
  es: "español",
  fr: "français",
  de: "Deutsch",
  pt: "português",
};

export const LOCALE_COOKIE = "wt_locale";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
