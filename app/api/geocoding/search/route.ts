import { NextRequest, NextResponse } from "next/server";

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  address?: { country_code?: string };
}

// Proxy server-side verso Nominatim: le richieste dirette dal browser non
// possono impostare uno User-Agent identificativo (i browser lo bloccano),
// requisito della policy di Nominatim, e venivano quindi rifiutate in modo
// intermittente. Passando dal server evitiamo anche qualsiasi problema CORS.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json([]);

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=it&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WikiTravels/1.0 (https://wikitravels.it; contatto: meazzini7@gmail.com)",
      },
    });
    if (!res.ok) return NextResponse.json([]);
    const data = (await res.json()) as NominatimItem[];
    const results = data.map((item) => ({
      label: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      countryCode: item.address?.country_code?.toLowerCase() ?? "",
    }));
    return NextResponse.json(results);
  } catch (err) {
    console.error("Ricerca Nominatim fallita:", err);
    return NextResponse.json([]);
  }
}
