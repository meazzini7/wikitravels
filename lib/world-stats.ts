"use client";

import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "./firebase-client";
import { alpha2ToAlpha3 } from "./iso-countries";
import type { Trip, TripStop } from "./types";

// Numero di viaggi pubblici per nazione (id alpha-3): usato per il
// mappamondo choropleth in home.
export function tripCountsByCountry(trips: Trip[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const trip of trips) {
    const alpha3Codes = new Set(
      (trip.countryCodes ?? []).map((code) => alpha2ToAlpha3(code)).filter((c): c is string => !!c)
    );
    for (const code of alpha3Codes) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

// Evidenziazione binaria (1 = visitato) per la mappa "mondo visitato" nel
// profilo: alpha-3 -> 1 per ogni nazione toccata da almeno un viaggio.
export function visitedCountriesMap(trips: Trip[]): Record<string, number> {
  const visited: Record<string, number> = {};
  for (const trip of trips) {
    for (const code of trip.countryCodes ?? []) {
      const a3 = alpha2ToAlpha3(code);
      if (a3) visited[a3] = 1;
    }
  }
  return visited;
}

export interface VisitedWorldStats {
  citiesCount: number;
  countriesCount: number;
}

// Conta città/nazioni distinte visitate da un utente, leggendo tutte le
// tappe dei suoi viaggi via collectionGroup (serve il campo `authorId`
// denormalizzato su ogni tappa e l'indice in firestore.indexes.json).
export async function fetchVisitedWorldStats(uid: string): Promise<VisitedWorldStats> {
  const db = getFirebaseDb();
  const snap = await getDocs(query(collectionGroup(db, "stops"), where("authorId", "==", uid)));
  const stops = snap.docs.map((d) => d.data() as TripStop);
  const countries = new Set(stops.map((s) => s.countryCode).filter(Boolean));
  return { citiesCount: stops.length, countriesCount: countries.size };
}
