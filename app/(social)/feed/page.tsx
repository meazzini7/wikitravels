"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { computeMatchScore } from "@/lib/travel-utils";
import { defaultInterestScores } from "@/lib/interests";
import { TRIP_TYPE_LABELS } from "@/lib/trip-types";
import FlamingoMascot from "@/components/FlamingoMascot";
import PageHero from "@/components/ui/PageHero";
import MatchGauge from "@/components/ui/MatchGauge";
import EmptyState from "@/components/ui/EmptyState";
import type { Trip } from "@/lib/types";

export default function FeedPage() {
  const { user, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    const q = query(
      collection(getFirebaseDb(), "trips"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
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
          <Link href="/login" className="font-bold text-brand-700">
            accedere
          </Link>{" "}
          per vedere il feed.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHero
        eyebrow="Scopri"
        title="Feed viaggi 🧭"
        subtitle="Ordinati per quanto assomigliano ai tuoi interessi"
        className="mb-6"
      />
      {loadingFeed ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      ) : rankedTrips.length === 0 ? (
        <EmptyState title="Nessun viaggio pubblicato ancora" description="Torna presto, la community cresce ogni giorno!" />
      ) : (
        <ul className="flex flex-col gap-4">
          {rankedTrips.map(({ trip, matchScore }) => (
            <li key={trip.id} className="card-surface overflow-hidden">
              <Link href={`/viaggi/${trip.id}`} className="block">
                <div className="relative h-40 w-full bg-gradient-to-br from-brand-100 to-lagoon-100">
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
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute right-2 top-2 rounded-full bg-white p-0.5 shadow">
                    <MatchGauge percent={matchScore} size={40} />
                  </span>
                  <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                    {TRIP_TYPE_LABELS[trip.tripType] ?? "Viaggio"}
                  </span>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <Link href={`/viaggi/${trip.id}`} className="truncate font-heading font-bold text-gray-900">
                    {trip.title}
                  </Link>
                  <p className="truncate text-sm text-gray-500">
                    {trip.startDate} → {trip.endDate} · {trip.totalDistanceKm.toFixed(0)} km
                  </p>
                  <Link
                    href={`/utenti/${trip.authorId}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
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
