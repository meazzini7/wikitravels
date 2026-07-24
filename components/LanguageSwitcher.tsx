"use client";

import { useState } from "react";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useI18n, useTranslations } from "@/lib/i18n/i18n-context";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const t = useTranslations("language");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("label")}
        className="flex min-h-[44px] items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700"
      >
        🌐 <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Chiudi"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-lg">
            {SUPPORTED_LOCALES.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setLocale(code);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                    code === locale ? "font-bold text-brand-700" : "text-gray-700"
                  }`}
                >
                  {LOCALE_LABELS[code]}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
