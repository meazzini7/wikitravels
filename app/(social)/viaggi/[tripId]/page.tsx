"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { exportTripPdf } from "@/lib/export-trip-pdf";
import type { Trip, TripStop } from "@/lib/types";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-lg bg-gray-100" />,
});

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const db = getFirebaseDb();
    const tripId = params.tripId;
    (async () => {
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      if (!tripSnap.exists()) {
        setNotFound(true);
        setLoadingTrip(false);
        return;
      }
      setTrip(tripSnap.data() as Trip);
      const stopsSnap = await getDocs(
        query(collection(db, "trips", tripId, "stops"), orderBy("order", "asc"))
      );
      setStops(stopsSnap.docs.map((d) => d.data() as TripStop));
      setLoadingTrip(false);
    })();
  }, [params.tripId]);

  if (loadingTrip) {
    return <main className="mx-auto max-w-3xl px-4 py-12 text-gray-500">Caricamento...</main>;
  }
  if (notFound || !trip) {
    return <main className="mx-auto max-w-3xl px-4 py-12 text-gray-500">Viaggio non trovato.</main>;
  }

  const isOwner = user?.uid === trip.authorId;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="relative mb-4 h-56 w-full overflow-hidden rounded-lg bg-brand-50">
        {trip.coverImageUrl && (
          <Image src={trip.coverImageUrl} alt={trip.title} fill className="object-cover" sizes="768px" priority />
        )}
      </div>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
          <p className="text-sm text-gray-500">
            {trip.startDate} → {trip.endDate} · {trip.totalDistanceKm.toFixed(0)} km
          </p>
        </div>
        <button
          onClick={() => exportTripPdf(trip, stops)}
          className="flex min-h-[44px] shrink-0 items-center rounded-md border border-brand-300 px-4 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Esporta PDF
        </button>
      </div>
      {trip.description && <p className="mb-6 text-gray-700">{trip.description}</p>}

      <TripMap
        stops={stops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))}
        className="mb-6 h-80 w-full rounded-lg"
      />

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Tappe</h2>
      <ol className="flex flex-col gap-3">
        {stops.map((stop, i) => (
          <li key={stop.id} className="rounded-lg border border-gray-100 p-3">
            <p className="font-medium text-gray-900">
              {i + 1}. {stop.name}
            </p>
            <p className="text-sm text-gray-500">
              {stop.startDate} → {stop.endDate}
            </p>
          </li>
        ))}
      </ol>
      {isOwner && <p className="mt-6 text-xs text-gray-400">Sei il proprietario di questo viaggio.</p>}
    </main>
  );
}
