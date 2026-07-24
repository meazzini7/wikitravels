import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { fetchAndUploadImage } from "@/lib/server/fetch-and-upload-image";
import { generateReferralCode } from "@/lib/id";
import { distributeDates, formatISODate, totalTripDistanceKm } from "@/lib/travel-utils";
import { DEMO_TRIPS } from "@/lib/server/demo-trips-data";
import type { Trip, TripStop, UserProfile } from "@/lib/types";

// Unsplash (per le copertine) + una scrittura Firestore per viaggio possono
// superare i 10s di default di Vercel per i 15 viaggi da seminare in sequenza.
export const maxDuration = 60;

function slugifyBase(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 14) || "viaggiatore"
  );
}

// Versione lato server (Admin SDK) dell'equivalente client in lib/nickname.ts:
// stessa logica di generazione, ma qui non possiamo usare l'SDK client.
async function ensureUniqueNickname(
  db: FirebaseFirestore.Firestore,
  base: string
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = attempt === 0 ? "" : String(Math.floor(Math.random() * 9000) + 100);
    const candidate = `${base}${suffix}`;
    const snap = await db.collection("users").where("nicknameLower", "==", candidate).limit(1).get();
    if (snap.empty) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

// Visitabile una tantum (protetto da CRON_SECRET come i cron esistenti, vedi
// lib/cron-auth.ts) per popolare Feed/Classifica con viaggi verosimili al
// lancio del portale. Idempotente: un viaggio già presente (stesso slug come
// id documento) viene saltato, quindi rivisitare l'URL più volte non crea
// duplicati né duplica le statistiche degli autori fittizi.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const db = getAdminDb();
  const createdUsers: string[] = [];
  const createdTrips: string[] = [];
  const skippedTrips: string[] = [];

  for (let i = 0; i < DEMO_TRIPS.length; i++) {
    const demo = DEMO_TRIPS[i];
    const tripRef = db.collection("trips").doc(demo.slug);
    const tripSnap = await tripRef.get();
    if (tripSnap.exists) {
      skippedTrips.push(demo.slug);
      continue;
    }

    const totalDistanceKm = totalTripDistanceKm(demo.stops);
    // Ogni autore fittizio ha esattamente un viaggio in questo set, quindi le
    // statistiche iniziali del profilo coincidono con quelle del viaggio.
    const userRef = db.collection("users").doc(demo.authorUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      const nickname = await ensureUniqueNickname(db, slugifyBase(demo.authorDisplayName));
      const profile: UserProfile = {
        uid: demo.authorUid,
        displayName: demo.authorDisplayName,
        nickname,
        nicknameLower: nickname.toLowerCase(),
        email: "",
        photoURL: null,
        bio: "",
        interests: demo.scores,
        onboardingCompleted: true,
        createdAt: Date.now() - (DEMO_TRIPS.length - i) * 2 * 24 * 60 * 60 * 1000,
        stats: { tripsCount: 1, totalDistanceKm, followersCount: 0, followingCount: 0 },
        homeLocation: null,
        dreamDestinations: [],
        dreamDestinationKeys: [],
        referralCode: generateReferralCode(),
        participantTripIds: [],
      };
      await userRef.set(profile);
      createdUsers.push(demo.authorUid);
    }

    const cover = await fetchAndUploadImage(demo.coverQuery).catch(() => null);
    const countryCodes = Array.from(new Set(demo.stops.map((s) => s.countryCode).filter(Boolean)));
    const dateRanges = distributeDates(new Date(demo.startDate), new Date(demo.endDate), demo.stops.length);
    const createdAt = Date.now() - (DEMO_TRIPS.length - i) * 2 * 24 * 60 * 60 * 1000;

    const trip: Trip = {
      id: demo.slug,
      authorId: demo.authorUid,
      authorDisplayName: demo.authorDisplayName,
      authorPhotoURL: null,
      authorInterests: demo.scores,
      scores: demo.scores,
      title: demo.title,
      startDate: demo.startDate,
      endDate: demo.endDate,
      coverImageUrl: cover?.url ?? null,
      totalDistanceKm,
      visibility: "public",
      tripType: demo.tripType,
      costEuro: demo.costEuro,
      countryCodes,
      homeDistanceKm: null,
      homeTravelHours: null,
      status: "published",
      createdAt,
      updatedAt: createdAt,
    };
    await tripRef.set(trip);

    const batch = db.batch();
    demo.stops.forEach((stop, idx) => {
      const range = dateRanges[idx];
      const stopRef = tripRef.collection("stops").doc();
      const stopDoc: TripStop = {
        id: stopRef.id,
        authorId: demo.authorUid,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        countryCode: stop.countryCode,
        order: idx,
        startDate: range ? formatISODate(range.start) : demo.startDate,
        endDate: range ? formatISODate(range.end) : demo.endDate,
        poiRatings: stop.pois.map((p) => ({ name: p.name, rating: p.rating })),
      };
      batch.set(stopRef, stopDoc);
    });
    await batch.commit();

    createdTrips.push(demo.slug);
  }

  return NextResponse.json({ ok: true, createdUsers, createdTrips, skippedTrips });
}
