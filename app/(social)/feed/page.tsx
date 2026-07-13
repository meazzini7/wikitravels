"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { computeMatchScore } from "@/lib/travel-utils";
import { defaultInterestScores } from "@/lib/interests";
import FlamingoMascot from "@/components/FlamingoMascot";
import type { Trip } from "@/lib/types";

export default function FeedPage() {
  const { user, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    const q = query(
      collection(getFirebaseDb(), "trips"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    getDocs(q)
      .then((snap) => setTrips(snap.docs.map((d) => d.data() as Trip)))
      .catch((err) => console.error("Impossibile caricare il feed:", err))
      .finally(() => setLoadingFeed(false));
  }, []);

  const viewerInterests = profile?.interests ?? defaultInterestScores();

  const rankedTrips = useMemo(() => {
    return trips
      .map((trip) => ({
        trip,
        matchScore: computeMatchScore(viewerInterests, trip.authorInterests ?? defaultInterestScores()),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, profile?.interests]);

  if (!loading && !user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-600">
          Devi{" "}
          <Link href="/login" className="font-medium text-brand-700">
            accedere
          </Link>{" "}
          per vedere il feed.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Feed viaggi</h1>
      {loadingFeed ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : rankedTrips.length === 0 ? (
        <p className="text-gray-500">Nessun viaggio pubblicato ancora.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rankedTrips.map(({ trip, matchScore }) => (
            <li key={trip.id} className="overflow-hidden rounded-lg border border-gray-100">
              <Link href={`/viaggi/${trip.id}`} className="block">
                <div className="relative h-40 w-full bg-brand-50">
                  {trip.coverImageUrl ? (
                    <Image
                      src={trip.coverImageUrl}
                      alt={trip.title}
                      fill
                      className="object-cover"
                      sizes="512px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-14 w-14" />
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-brand-700">
                    {matchScore}% match
                  </span>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <Link href={`/viaggi/${trip.id}`} className="truncate font-semibold text-gray-900">
                    {trip.title}
                  </Link>
                  <p className="truncate text-sm text-gray-500">
                    {trip.startDate} → {trip.endDate} · {trip.totalDistanceKm.toFixed(0)} km
                  </p>
                  <Link
                    href={`/utenti/${trip.authorId}`}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    {trip.authorDisplayName}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
