"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import FlamingoMascot from "@/components/FlamingoMascot";
import PageHero from "@/components/ui/PageHero";
import EmptyState from "@/components/ui/EmptyState";
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
          <Link href="/login" className="font-bold text-brand-700">
            accedere
          </Link>{" "}
          per vedere i tuoi viaggi.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHero eyebrow="I tuoi ricordi" title="I miei viaggi 🧳" className="mb-6">
        <Link
          href="/viaggi/nuovo"
          className="tap-scale flex min-h-[44px] w-fit items-center gap-1 rounded-full bg-white px-4 font-heading font-bold text-brand-700 shadow-lg"
        >
          ✚ Nuovo viaggio
        </Link>
      </PageHero>
      {loadingTrips ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <EmptyState title="Non hai ancora creato nessun viaggio" description="Il primo passo è il più bello: raccontalo!">
          <Link
            href="/viaggi/nuovo"
            className="tap-scale mt-2 flex min-h-[44px] items-center rounded-full bg-brand-600 px-5 font-bold text-white shadow-pop"
          >
            ✚ Crea il tuo primo viaggio
          </Link>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link href={`/viaggi/${trip.id}`} className="tap-scale card-surface flex gap-4 p-3 hover:border-brand-200">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-lagoon-100">
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate font-heading font-bold text-gray-900">{trip.title}</h2>
                    <span className="text-xs" aria-hidden>
                      {trip.visibility === "public" ? "🌍" : "🔒"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {trip.startDate} → {trip.endDate}
                  </p>
                  <p className="text-sm font-semibold text-brand-700">{trip.totalDistanceKm.toFixed(0)} km</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
