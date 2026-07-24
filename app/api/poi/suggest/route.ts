import { NextRequest, NextResponse } from "next/server";
import { getPoiSuggestions } from "@/lib/server/poi-suggestions";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const place = req.nextUrl.searchParams.get("place")?.trim() ?? "";
  if (place.length < 2) return NextResponse.json({ names: [] });

  try {
    const names = await getPoiSuggestions(place);
    return NextResponse.json({ names });
  } catch (err) {
    console.error(`Impossibile suggerire punti di interesse per "${place}":`, err);
    return NextResponse.json({ names: [] });
  }
}
