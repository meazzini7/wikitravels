"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import FlamingoMascot from "@/components/FlamingoMascot";
import type { Trip } from "@/lib/types";

export default function ViaggiPage() {
  const { user, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingTrips(false);
      return;
    }
    const q = query(
      collection(getFirebaseDb(), "trips"),
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q)
      .then((snap) => setTrips(snap.docs.map((d) => d.data() as Trip)))
      .catch((err) => console.error("Impossibile caricare i viaggi:", err))
      .finally(() => setLoadingTrips(false));
  }, [user]);

  if (!loading && !user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-600">
          Devi{" "}
          <Link href="/login" className="font-medium text-brand-700">
            accedere
          </Link>{" "}
          per vedere i tuoi viaggi.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">I miei viaggi</h1>
        <Link
          href="/viaggi/nuovo"
          className="flex min-h-[44px] items-center rounded-md bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
        >
          + Nuovo viaggio
        </Link>
      </div>
      {loadingTrips ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : trips.length === 0 ? (
        <p className="text-gray-500">Non hai ancora creato nessun viaggio.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/viaggi/${trip.id}`}
                className="flex gap-4 rounded-lg border border-gray-100 p-3 hover:border-brand-200"
              >
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-brand-50">
                  {trip.coverImageUrl ? (
                    <Image
                      src={trip.coverImageUrl}
                      alt={trip.title}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-gray-900">{trip.title}</h2>
                  <p className="text-sm text-gray-500">
                    {trip.startDate} → {trip.endDate}
                  </p>
                  <p className="text-sm text-gray-500">{trip.totalDistanceKm.toFixed(0)} km</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
