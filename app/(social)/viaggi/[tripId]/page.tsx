"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { exportTripPdf } from "@/lib/export-trip-pdf";
import { TRIP_TYPE_LABELS } from "@/lib/trip-types";
import FlamingoMascot from "@/components/FlamingoMascot";
import type { Trip, TripStop } from "@/lib/types";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100" />,
});

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const db = getFirebaseDb();
    const tripId = params.tripId;
    (async () => {
      try {
        const tripSnap = await getDoc(doc(db, "trips", tripId));
        if (!tripSnap.exists()) {
          setNotFound(true);
          return;
        }
        setTrip(tripSnap.data() as Trip);

        if (user) {
          const stopsSnap = await getDocs(
            query(collection(db, "trips", tripId, "stops"), orderBy("order", "asc"))
          );
          setStops(stopsSnap.docs.map((d) => d.data() as TripStop));
        }
      } catch (err) {
        console.error("Impossibile caricare il viaggio:", err);
        setNotFound(true);
      } finally {
        setLoadingTrip(false);
      }
    })();
  }, [params.tripId, user, authLoading]);

  if (loadingTrip || authLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-56 w-full animate-pulse rounded-3xl bg-gray-100" />
      </main>
    );
  }
  if (notFound || !trip) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <FlamingoMascot className="mx-auto mb-3 h-14 w-14 opacity-60" />
        <p className="text-gray-500">Viaggio non trovato.</p>
      </main>
    );
  }

  const isOwner = user?.uid === trip.authorId;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="relative mb-4 h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-200 to-lagoon-200 shadow-soft sm:h-72">
        {trip.coverImageUrl ? (
          <Image src={trip.coverImageUrl} alt={trip.title} fill className="object-cover" sizes="768px" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-400">
            <FlamingoMascot className="h-20 w-20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <h1 className="font-heading text-2xl font-extrabold drop-shadow sm:text-3xl">{trip.title}</h1>
            <p className="text-sm font-semibold text-white/90">
              {trip.startDate} → {trip.endDate}
            </p>
          </div>
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
            {trip.visibility === "public" ? "🌍 Pubblico" : "🔒 Privato"}
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl bg-brand-50 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-brand-700">{trip.totalDistanceKm.toFixed(0)}</p>
          <p className="text-[10px] font-semibold text-brand-600">km</p>
        </div>
        <div className="rounded-2xl bg-lagoon-50 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-lagoon-700">{stops.length || "—"}</p>
          <p className="text-[10px] font-semibold text-lagoon-600">tappe</p>
        </div>
        <div className="rounded-2xl bg-sun-50 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-sun-700">{TRIP_TYPE_LABELS[trip.tripType]}</p>
          <p className="text-[10px] font-semibold text-sun-700">tipo</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-gray-700">{trip.costEuro ? `${trip.costEuro}€` : "—"}</p>
          <p className="text-[10px] font-semibold text-gray-500">costo</p>
        </div>
      </div>

      {trip.homeDistanceKm !== null && trip.homeTravelHours !== null && (
        <p className="mb-4 rounded-2xl bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
          🏠 Da casa: circa {trip.homeDistanceKm.toFixed(0)} km, {trip.homeTravelHours.toFixed(1)} ore
        </p>
      )}

      {trip.description && (
        <p className="card-surface mb-6 p-4 text-gray-700">{trip.description}</p>
      )}

      {user && (
        <button
          onClick={() => exportTripPdf(trip, stops)}
          className="tap-scale mb-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-300 font-bold text-brand-700 hover:bg-brand-50"
        >
          📄 Esporta PDF
        </button>
      )}

      {user ? (
        <>
          <TripMap
            stops={stops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))}
            className="mb-6 h-80 w-full rounded-3xl"
          />

          <h2 className="mb-3 font-heading text-lg font-bold text-gray-900">📍 Tappe</h2>
          <ol className="flex flex-col gap-3">
            {stops.map((stop, i) => (
              <li key={stop.id} className="card-surface flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-heading font-bold text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-gray-900">{stop.name}</p>
                  <p className="text-sm text-gray-500">
                    {stop.startDate} → {stop.endDate}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {isOwner && <p className="mt-6 text-center text-xs text-gray-400">Sei il proprietario di questo viaggio.</p>}
        </>
      ) : (
        <p className="card-surface p-4 text-center text-sm text-brand-700">
          <Link href="/login" className="font-bold underline">
            Accedi
          </Link>{" "}
          per vedere tappe, mappa ed esportare il PDF di questo viaggio.
        </p>
      )}
    </main>
  );
}
