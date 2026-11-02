"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setConsent, useConsent } from "@/lib/consent";

// Banner dei cookie: compare finché il visitatore non sceglie. "Rifiuta" e
// "Accetta" hanno lo stesso peso visivo (richiesto dal Garante privacy).
// Senza consenso Google Analytics non viene nemmeno caricato.
export default function CookieConsent() {
  const consent = useConsent();
  const pathname = usePathname();

  if (consent !== null) return null;
  if (pathname?.startsWith("/admin")) return null;

  return (
    <div
      role="dialog"
      aria-label="Preferenze sui cookie"
      className="fixed inset-x-3 bottom-[80px] z-30 mx-auto max-w-xl rounded-2xl border border-brand-100 bg-white p-4 shadow-pop sm:bottom-4"
    >
      <p className="text-sm text-gray-700">
        Usiamo cookie di misurazione (Google Analytics) per capire quali guide sono utili e migliorare il sito. Partono
        solo se li accetti.{" "}
        <Link href="/cookie" className="font-bold text-brand-600 underline">
          Maggiori informazioni
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="tap-scale rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800"
        >
          Rifiuta
        </button>
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="tap-scale rounded-xl border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          Accetta
        </button>
      </div>
    </div>
  );
}
