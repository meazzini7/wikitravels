export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  countryCode: string;
}

// Ricerca luoghi (Nominatim/OpenStreetMap, gratuita) tramite il nostro
// endpoint server-side /api/geocoding/search, che si occupa di impostare lo
// User-Agent richiesto dalla policy di Nominatim (vedi quel file).
export async function searchPlaces(queryText: string): Promise<GeocodeResult[]> {
  const q = queryText.trim();
  if (q.length < 3) return [];

  const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return (await res.json()) as GeocodeResult[];
}
