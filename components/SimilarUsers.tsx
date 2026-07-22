"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { computeMatchScore } from "@/lib/travel-utils";
import type { InterestScores } from "@/lib/interests";
import type { UserProfile } from "@/lib/types";
import MatchGauge from "@/components/ui/MatchGauge";
import FlamingoMascot from "@/components/FlamingoMascot";

interface SimilarUsersProps {
  currentUid: string;
  interests: InterestScores;
}

interface Match {
  profile: UserProfile;
  score: number;
}

// Il "matching magico": confronta i propri interessi (0-10 su 6 categorie)
// con quelli di un campione di altri utenti e mostra chi ti somiglia di
// più, per scoprire persone con cui condividere idee di viaggio.
export default function SimilarUsers({ currentUid, interests }: SimilarUsersProps) {
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(getFirebaseDb(), "users"), orderBy("createdAt", "desc"), limit(50)));
        const others = snap.docs
          .map((d) => d.data() as UserProfile)
          .filter((p) => p.uid !== currentUid && p.onboardingCompleted);
        const scored = others
          .map((p) => ({ profile: p, score: computeMatchScore(interests, p.interests) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        if (!cancelled) setMatches(scored);
      } catch (err) {
        console.error("Impossibile trovare utenti affini:", err);
        if (!cancelled) setMatches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUid, interests]);

  if (matches === null) {
    return <div className="h-20 w-full animate-pulse rounded-2xl bg-gray-100" />;
  }
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
        Nessun altro viaggiatore da confrontare ancora: torna a guardare qui più avanti!
      </p>
    );
  }

  return (
    <ul className="flex gap-3 overflow-x-auto pb-1">
      {matches.map(({ profile: p, score }) => (
        <li key={p.uid} className="shrink-0">
          <Link
            href={`/utenti/${p.uid}`}
            className="tap-scale card-surface flex w-32 flex-col items-center gap-1.5 p-3 text-center hover:border-brand-200"
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-brand-50">
              {p.photoURL ? (
                <Image src={p.photoURL} alt={p.displayName} fill className="object-cover" sizes="48px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brand-300">
                  <FlamingoMascot className="h-7 w-7" />
                </div>
              )}
            </div>
            <p className="w-full truncate text-xs font-bold text-gray-800">{p.displayName}</p>
            <MatchGauge percent={score} size={32} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
