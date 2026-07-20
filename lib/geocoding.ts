export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  countryCode: string;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  address?: { country_code?: string };
}

// Nominatim (OpenStreetMap): ricerca luoghi gratuita, nessuna API key. Usata
// al posto di Google Places Autocomplete per evitare di dover attivare la
// fatturazione di Google Cloud (vedi HANDOFF sezione 6).
export async function searchPlaces(queryText: string): Promise<GeocodeResult[]> {
  const q = queryText.trim();
  if (q.length < 3) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimItem[];
  return data.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    countryCode: item.address?.country_code?.toLowerCase() ?? "",
  }));
}
