"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionary";
import type { Dictionary } from "./types";

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readCookieLocale(): Locale | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value && isLocale(value) ? value : null;
}

// Il guscio renderizzato dal server è sempre in italiano (vedi app/layout.tsx:
// leggere la lingua dal cookie lì forzerebbe l'intero sito a non essere mai
// servito in cache). Qui, subito dopo l'idratazione, si legge il cookie
// salvato da una scelta precedente e si corregge la lingua lato client: per
// chi ha già scelto una lingua diversa dall'italiano c'è un breve istante
// (nessuna richiesta di rete, solo lettura del cookie) in cui vede il
// guscio in italiano prima della correzione — un compromesso accettato per
// poter servire il resto del sito in modo statico/cache.
export function I18nProvider({
  locale: initialLocale,
  dictionary: initialDictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(initialDictionary);

  useEffect(() => {
    const saved = readCookieLocale();
    if (saved && saved !== DEFAULT_LOCALE) {
      setLocaleState(saved);
      setDictionary(getDictionary(saved));
      document.documentElement.lang = saved;
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocaleState(next);
    setDictionary(getDictionary(next));
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(() => ({ locale, dictionary, setLocale }), [locale, dictionary, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n usato fuori da I18nProvider");
  return ctx;
}

type DictSection = keyof Dictionary;

// const t = useTranslations("home"); t("createTrip") -> testo tradotto
// della sezione "home" nella lingua corrente. Supporta segnaposto tipo
// "Ciao {name}" passando { name: "Paolo" }.
export function useTranslations<S extends DictSection>(section: S) {
  const { dictionary } = useI18n();
  return useCallback(
    (key: keyof Dictionary[S], vars?: Record<string, string | number>) => {
      let text = String(dictionary[section][key]);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [dictionary, section]
  );
}
