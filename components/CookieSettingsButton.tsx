"use client";

import { setConsent } from "@/lib/consent";

// Permette di cambiare idea in qualsiasi momento: cancella la scelta e il
// banner dei cookie ricompare.
export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => setConsent(null)}
      className="font-semibold text-gray-600 hover:text-brand-600"
    >
      Gestisci cookie
    </button>
  );
}
