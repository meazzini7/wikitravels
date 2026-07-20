"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import FlamingoMascot from "@/components/FlamingoMascot";
import PageHero from "@/components/ui/PageHero";
import EmptyState from "@/components/ui/EmptyState";
import type { UserProfile } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_HEIGHTS = ["h-24", "h-16", "h-12"];
const PODIUM_ORDER = [1, 0, 2]; // 2° - 1° - 3° al centro più alto

function Avatar({ profile, size }: { profile: UserProfile; size: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-brand-50 ring-2 ring-white"
      style={{ width: size, height: size }}
    >
      {profile.photoURL ? (
        <Image src={profile.photoURL} alt={profile.displayName} fill className="object-cover" sizes={`${size}px`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-brand-300">
          <FlamingoMascot className="h-2/3 w-2/3" />
        </div>
      )}
    </div>
  );
}

export default function ClassificaPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    const q = query(collection(getFirebaseDb(), "users"), orderBy("stats.totalDistanceKm", "desc"), limit(20));
    getDocs(q)
      .then((snap) => setProfiles(snap.docs.map((d) => d.data() as UserProfile)))
      .catch((err) => console.error("Impossibile caricare la classifica:", err))
      .finally(() => setLoadingList(false));
  }, []);

  const podium = profiles.slice(0, 3);
  const rest = profiles.slice(3);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHero eyebrow="Sfida i tuoi amici" title="Classifica viaggiatori 🏆" subtitle="Chi ha percorso più km" className="mb-6" />

      {loadingList ? (
        <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
      ) : profiles.length === 0 ? (
        <EmptyState title="Nessun viaggiatore in classifica ancora" />
      ) : (
        <>
          {podium.length > 0 && (
            <div className="card-surface mb-6 flex items-end justify-center gap-3 px-4 pb-4 pt-6">
              {PODIUM_ORDER.filter((i) => podium[i]).map((i) => (
                <Link key={podium[i].uid} href={`/utenti/${podium[i].uid}`} className="flex flex-col items-center gap-1.5">
                  <span className="text-xl">{MEDALS[i]}</span>
                  <Avatar profile={podium[i]} size={i === 0 ? 64 : 52} />
                  <p className="max-w-[80px] truncate text-center text-xs font-bold text-gray-900">
                    {podium[i].displayName}
                  </p>
                  <div
                    className={`w-16 rounded-t-xl bg-gradient-to-t from-brand-500 to-brand-300 ${PODIUM_HEIGHTS[i]} flex items-start justify-center pt-1`}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {podium[i].stats.totalDistanceKm.toFixed(0)}km
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <ol className="flex flex-col gap-2">
              {rest.map((p, i) => (
                <li key={p.uid}>
                  <Link
                    href={`/utenti/${p.uid}`}
                    className="tap-scale card-surface flex items-center gap-3 px-3 py-2.5 hover:border-brand-200"
                  >
                    <span className="w-6 shrink-0 text-center font-heading font-bold text-gray-400">{i + 4}</span>
                    <Avatar profile={p} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-gray-900">{p.displayName}</p>
                      <p className="text-xs text-gray-500">{p.stats.tripsCount} viaggi</p>
                    </div>
                    <p className="shrink-0 font-heading font-bold text-brand-700">
                      {p.stats.totalDistanceKm.toFixed(0)} km
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </main>
  );
}
