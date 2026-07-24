"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./types";
import { LOCALE_COOKIE } from "./config";

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Passa la lingua e il dizionario già risolti dal server (letti dal
// middleware/cookie) invece di ri-rilevarli lato client, per evitare uno
// sfarfallio della lingua durante l'idratazione.
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Un ricaricamento completo, non un semplice cambio di stato: anche i
    // Server Component (che leggono la lingua dal cookie a ogni richiesta)
    // devono ri-renderizzare nella nuova lingua.
    window.location.reload();
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
