"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import FlamingoMascot from "@/components/FlamingoMascot";
import type { UserProfile } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Classifica viaggiatori</h1>
      {loadingList ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : profiles.length === 0 ? (
        <p className="text-gray-500">Nessun viaggiatore in classifica ancora.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {profiles.map((p, i) => (
            <li key={p.uid}>
              <Link
                href={`/utenti/${p.uid}`}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 hover:border-brand-200"
              >
                <span className="w-8 shrink-0 text-center text-lg">{MEDALS[i] ?? i + 1}</span>
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-50">
                  {p.photoURL ? (
                    <Image src={p.photoURL} alt={p.displayName} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{p.displayName}</p>
                  <p className="text-xs text-gray-500">{p.stats.tripsCount} viaggi</p>
                </div>
                <p className="shrink-0 font-semibold text-brand-700">
                  {p.stats.totalDistanceKm.toFixed(0)} km
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
