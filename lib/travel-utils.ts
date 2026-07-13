import { INTEREST_KEYS, type InterestScores } from "./interests";

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function totalTripDistanceKm(stops: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversineDistanceKm(stops[i - 1], stops[i]);
  }
  return total;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Distribuisce i giorni del viaggio tra le tappe in proporzione e in ordine:
// le prime tappe assorbono l'eventuale resto della divisione intera.
export function distributeDates(startDate: Date, endDate: Date, stopsCount: number): DateRange[] {
  if (stopsCount <= 0) return [];
  const oneDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / oneDay) + 1);
  const baseDays = Math.floor(totalDays / stopsCount);
  const remainder = totalDays % stopsCount;

  const ranges: DateRange[] = [];
  let cursor = new Date(startDate);
  for (let i = 0; i < stopsCount; i++) {
    const days = Math.max(1, baseDays + (i < remainder ? 1 : 0));
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + days - 1);
    ranges.push({ start, end });
    cursor = new Date(end);
    cursor.setDate(cursor.getDate() + 1);
  }
  return ranges;
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Percentuale di affinità (0-100) tra due vettori di interesse (scala 1-10
// su ognuna delle 7 chiavi): usata nel feed pubblico per suggerire viaggi
// in base a quanto gli interessi dell'autore assomigliano ai propri.
export function computeMatchScore(a: InterestScores, b: InterestScores): number {
  const diffs = INTEREST_KEYS.map((key) => Math.abs(a[key] - b[key]) / 9);
  const avgDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  return Math.round((1 - avgDiff) * 100);
}
