"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { tripCountsByCountry } from "@/lib/world-stats";
import FlamingoMascot from "@/components/FlamingoMascot";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";
import type { Trip } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-gray-100" />,
});

const EXPLORE_CARDS = [
  { href: "/feed", icon: "🧭", title: "Feed", desc: "Viaggi in linea con i tuoi gusti" },
  { href: "/classifica", icon: "🏆", title: "Classifica", desc: "Chi ha percorso più km" },
  { href: "/enciclopedia", icon: "📖", title: "Enciclopedia", desc: "Guide di destinazione" },
];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [travelerCount, setTravelerCount] = useState<number | null>(null);
  const [publicTripCount, setPublicTripCount] = useState<number | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const q = query(
      collection(db, "trips"),
      where("status", "==", "published"),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(60)
    );
    getDocs(q)
      .then((snap) => setTrips(snap.docs.map((d) => d.data() as Trip)))
      .catch((err) => console.error("Impossibile caricare i viaggi della community:", err))
      .finally(() => setLoadingTrips(false));

    getCountFromServer(collection(db, "users"))
      .then((res) => setTravelerCount(res.data().count))
      .catch(() => setTravelerCount(null));
    getCountFromServer(query(collection(db, "trips"), where("status", "==", "published"), where("visibility", "==", "public")))
      .then((res) => setPublicTripCount(res.data().count))
      .catch(() => setPublicTripCount(null));
  }, []);

  const countryCounts = useMemo(() => tripCountsByCountry(trips), [trips]);
  const countriesReached = Object.keys(countryCounts).length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <section className="relative mb-8 overflow-hidden rounded-4xl bg-gradient-to-br from-brand-600 via-brand-500 to-lagoon-500 px-6 py-10 text-center text-white shadow-pop sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-center gap-4">
          <FlamingoMascot className="h-20 w-20 drop-shadow-lg" />
          <h1 className="font-heading text-3xl font-extrabold sm:text-5xl">WikiTravels</h1>
          {!loading && user ? (
            <p className="max-w-xl text-base text-white/90 sm:text-lg">
              Bentornato, {profile?.displayName ?? user.email}! Ecco cosa succede nel mondo di WikiTravels oggi.
            </p>
          ) : (
            <p className="max-w-xl text-base text-white/90 sm:text-lg">
              Costruisci il tuo prossimo viaggio a bottoni, scopri quelli della community e sfida gli amici a km
              percorsi. Zero noia, tutto interattivo.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {!loading && user ? (
              <Link
                href="/viaggi/nuovo"
                className="tap-scale flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 font-heading font-bold text-brand-700 shadow-lg"
              >
                ✚ Crea un viaggio
              </Link>
            ) : (
              <Link
                href="/registrati"
                className="tap-scale flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 font-heading font-bold text-brand-700 shadow-lg"
              >
                🚀 Inizia a viaggiare
              </Link>
            )}
            <Link
              href="/feed"
              className="tap-scale flex min-h-[48px] items-center gap-2 rounded-full border-2 border-white/70 px-6 font-heading font-bold text-white"
            >
              🧭 Esplora viaggi
            </Link>
          </div>

          <div className="mt-4 grid w-full max-w-sm grid-cols-3 gap-2 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <div className="text-center">
              <p className="font-heading text-xl font-extrabold">{publicTripCount ?? "—"}</p>
              <p className="text-[11px] font-semibold text-white/80">Viaggi pubblici</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-xl font-extrabold">{countriesReached || "—"}</p>
              <p className="text-[11px] font-semibold text-white/80">Nazioni raggiunte</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-xl font-extrabold">{travelerCount ?? "—"}</p>
              <p className="text-[11px] font-semibold text-white/80">Viaggiatori</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-3 gap-3">
        {EXPLORE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="tap-scale card-surface flex flex-col items-center gap-1 px-2 py-4 text-center hover:border-brand-200"
          >
            <span className="text-2xl" aria-hidden>
              {card.icon}
            </span>
            <p className="font-heading text-sm font-bold text-gray-900">{card.title}</p>
            <p className="hidden text-xs text-gray-500 sm:block">{card.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mb-8">
        <div className="card-surface p-4 sm:p-6">
          <h2 className="mb-1 font-heading text-lg font-bold text-gray-900">🗺️ Il mondo di WikiTravels</h2>
          <p className="mb-3 text-sm text-gray-500">Nazioni colorate in base al numero di viaggi pubblici pubblicati.</p>
          <WorldMap values={countryCounts} mode="gradient" className="h-72 w-full rounded-2xl" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-gray-900">✨ Viaggi della community</h2>
          <Link href="/feed" className="text-sm font-bold text-brand-700">
            Vedi tutti →
          </Link>
        </div>
        {loadingTrips ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 w-40 shrink-0 animate-pulse rounded-3xl bg-gray-100" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="Nessun viaggio pubblico ancora"
            description="Sii il primo a pubblicare un'avventura sulla mappa!"
          >
            <Link
              href={user ? "/viaggi/nuovo" : "/registrati"}
              className="tap-scale mt-2 flex min-h-[44px] items-center rounded-full bg-brand-600 px-5 font-bold text-white shadow-pop"
            >
              ✚ Crea il primo viaggio
            </Link>
          </EmptyState>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
            {trips.slice(0, 12).map((trip) => (
              <Link
                key={trip.id}
                href={`/viaggi/${trip.id}`}
                className="tap-scale card-surface w-40 shrink-0 snap-start overflow-hidden sm:w-auto"
              >
                <div className="relative h-28 w-full bg-gradient-to-br from-brand-100 to-lagoon-100 sm:h-32">
                  {trip.coverImageUrl ? (
                    <Image src={trip.coverImageUrl} alt={trip.title} fill className="object-cover" sizes="200px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-10 w-10" />
                    </div>
                  )}
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
                    {trip.totalDistanceKm.toFixed(0)} km
                  </span>
                </div>
                <div className="p-2.5">
                  <h3 className="truncate font-heading text-sm font-bold text-gray-900">{trip.title}</h3>
                  <p className="truncate text-[11px] font-semibold text-brand-700">{trip.authorDisplayName}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!user && trips.length > 0 && (
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/registrati" className="font-bold text-brand-700 underline">
              Registrati
            </Link>{" "}
            per vedere tappe, mappe e dettagli completi di ogni viaggio.
          </p>
        )}
      </section>
    </main>
  );
}
