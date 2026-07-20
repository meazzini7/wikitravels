"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { tripCountsByCountry } from "@/lib/world-stats";
import FlamingoMascot from "@/components/FlamingoMascot";
import type { Trip } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-lg bg-gray-100" />,
});

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    const q = query(
      collection(getFirebaseDb(), "trips"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(60)
    );
    getDocs(q)
      .then((snap) => setTrips(snap.docs.map((d) => d.data() as Trip)))
      .catch((err) => console.error("Impossibile caricare i viaggi della community:", err))
      .finally(() => setLoadingTrips(false));
  }, []);

  const countryCounts = useMemo(() => tripCountsByCountry(trips), [trips]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <FlamingoMascot className="h-20 w-20" />
        <h1 className="text-3xl font-bold text-brand-700 sm:text-4xl">WikiTravels</h1>
        {!loading && user ? (
          <p className="max-w-xl text-base text-gray-600">
            Bentornato, {profile?.displayName ?? user.email}! Ecco i viaggi della community.
          </p>
        ) : (
          <>
            <p className="max-w-xl text-base text-gray-600">
              Il portale social per viaggiatori: organizza viaggi, connettiti con altri esploratori
              e scopri la nostra enciclopedia di destinazioni.
            </p>
            <Link
              href="/registrati"
              className="flex min-h-[44px] items-center rounded-md bg-brand-600 px-6 font-medium text-white hover:bg-brand-700"
            >
              Inizia a viaggiare
            </Link>
          </>
        )}
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Il mondo di WikiTravels</h2>
        <p className="mb-3 text-sm text-gray-500">Nazioni colorate in base al numero di viaggi pubblici pubblicati.</p>
        <WorldMap values={countryCounts} mode="gradient" className="h-80 w-full rounded-lg" />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Viaggi della community</h2>
        {loadingTrips ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : trips.length === 0 ? (
          <p className="text-gray-500">Nessun viaggio pubblico ancora.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {trips.slice(0, 12).map((trip) => (
              <li key={trip.id} className="overflow-hidden rounded-lg border border-gray-100">
                <Link href={`/viaggi/${trip.id}`} className="block">
                  <div className="relative h-32 w-full bg-brand-50">
                    {trip.coverImageUrl ? (
                      <Image
                        src={trip.coverImageUrl}
                        alt={trip.title}
                        fill
                        className="object-cover"
                        sizes="384px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-brand-300">
                        <FlamingoMascot className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="truncate font-semibold text-gray-900">{trip.title}</h3>
                    <p className="truncate text-xs text-gray-500">
                      {trip.startDate} → {trip.endDate} · {trip.totalDistanceKm.toFixed(0)} km
                    </p>
                    <p className="truncate text-xs text-brand-700">{trip.authorDisplayName}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!user && trips.length > 0 && (
          <p className="mt-4 text-sm text-gray-500">
            <Link href="/registrati" className="font-medium text-brand-700 underline">
              Registrati
            </Link>{" "}
            per vedere tappe, mappe e dettagli completi di ogni viaggio.
          </p>
        )}
      </section>
    </main>
  );
}
