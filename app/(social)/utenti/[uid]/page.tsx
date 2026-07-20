"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { unlockedBadges } from "@/lib/badges";
import FollowButton from "@/components/FollowButton";
import FlamingoMascot from "@/components/FlamingoMascot";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";
import type { Trip, UserProfile } from "@/lib/types";

export default function PublicProfilePage() {
  const params = useParams<{ uid: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    const uid = params.uid;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) setProfile(snap.data() as UserProfile);
        const tripsSnap = await getDocs(
          query(
            collection(db, "trips"),
            where("authorId", "==", uid),
            where("status", "==", "published"),
            where("visibility", "==", "public"),
            orderBy("createdAt", "desc")
          )
        );
        setTrips(tripsSnap.docs.map((d) => d.data() as Trip));
      } catch (err) {
        console.error("Impossibile caricare il profilo:", err);
      }
      setLoadingProfile(false);
    })();
  }, [params.uid]);

  if (loadingProfile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-40 w-full animate-pulse rounded-3xl bg-gray-100" />
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <FlamingoMascot className="mx-auto mb-3 h-14 w-14 opacity-60" />
        <p className="text-gray-500">Utente non trovato.</p>
      </main>
    );
  }

  const badges = unlockedBadges(profile.stats);
  const isSelf = user?.uid === profile.uid;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="card-surface mb-6 flex items-center gap-4 p-4 sm:p-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-50 ring-4 ring-brand-100">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.displayName} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand-300">
              <FlamingoMascot className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-xl font-bold text-gray-900">{profile.displayName}</h1>
          {profile.bio && <p className="text-sm text-gray-600">{profile.bio}</p>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatTile icon="🧳" value={profile.stats.tripsCount} label="Viaggi" />
        <StatTile icon="⭐" value={profile.stats.followersCount} label="Follower" tone="sun" />
        <StatTile icon="🤝" value={profile.stats.followingCount} label="Seguiti" tone="lagoon" />
      </div>

      {!isSelf && (
        <div className="mb-6 flex gap-3">
          <FollowButton targetUid={profile.uid} />
          <Link
            href={`/chat/${profile.uid}`}
            className="tap-scale flex min-h-[44px] items-center rounded-full border-2 border-gray-200 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            💬 Scrivi un messaggio
          </Link>
        </div>
      )}

      {badges.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-heading text-sm font-bold text-gray-700">🏅 Badge</h2>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.id}
                title={b.description}
                className="flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1.5 text-sm font-bold text-sun-700"
              >
                <span aria-hidden>{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-3 font-heading text-lg font-bold text-gray-900">✈️ Viaggi pubblicati</h2>
      {trips.length === 0 ? (
        <EmptyState title="Nessun viaggio pubblicato ancora" />
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link href={`/viaggi/${trip.id}`} className="tap-scale card-surface block p-3 hover:border-brand-200">
                <p className="font-bold text-gray-900">{trip.title}</p>
                <p className="text-sm text-gray-500">
                  {trip.startDate} → {trip.endDate} · {trip.totalDistanceKm.toFixed(0)} km
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
