"use client";

import { useSyncExternalStore } from "react";

// Scelta del visitatore sui cookie di misurazione (Google Analytics).
// Salvata solo nel browser: "granted" = accettati, "denied" = rifiutati,
// null = non ancora scelto (il banner viene mostrato). Nessun dato personale.
export type ConsentChoice = "granted" | "denied" | null;

const STORAGE_KEY = "wt-cookie-consent-v1";
const CHANGE_EVENT = "wt-consent-change";

function read(): ConsentChoice {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  try {
    if (choice) window.localStorage.setItem(STORAGE_KEY, choice);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage non disponibile (navigazione privata, blocchi): la scelta vale
    // solo finché la pagina resta aperta, e il banner si ripresenterà.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Lato server (e prima dell'idratazione) restituisce "unknown": né banner né
// tracciamento finché non si sa cosa ha scelto il visitatore.
export function useConsent(): ConsentChoice | "unknown" {
  return useSyncExternalStore<ConsentChoice | "unknown">(subscribe, read, () => "unknown");
}
