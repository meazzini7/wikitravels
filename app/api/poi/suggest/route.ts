import { NextRequest, NextResponse } from "next/server";
import { getPoiSuggestions } from "@/lib/server/poi-suggestions";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const place = req.nextUrl.searchParams.get("place")?.trim() ?? "";
  if (place.length < 2) return NextResponse.json({ names: [] });
  const exclude =
    req.nextUrl.searchParams
      .get("exclude")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  try {
    const names = await getPoiSuggestions(place, exclude);
    return NextResponse.json(
      { names },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (err) {
    console.error(`Impossibile suggerire punti di interesse per "${place}":`, err);
    return NextResponse.json({ names: [] });
  }
}
