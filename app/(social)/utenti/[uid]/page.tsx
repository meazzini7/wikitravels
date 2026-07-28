"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import type { BadgeContext } from "@/lib/badges";
import { computeMatchScore } from "@/lib/travel-utils";
import { checkMutualFollow } from "@/lib/social";
import { fetchVisitedWorldStats, type VisitedWorldStats } from "@/lib/world-stats";
import { INTEREST_ICONS, INTEREST_KEYS, INTEREST_LABELS } from "@/lib/interests";
import FollowButton from "@/components/FollowButton";
import FlamingoMascot from "@/components/FlamingoMascot";
import BadgesShowcase from "@/components/BadgesShowcase";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";
import MatchGauge from "@/components/ui/MatchGauge";
import type { Trip, UserProfile } from "@/lib/types";

export default function PublicProfilePage() {
  const params = useParams<{ uid: string }>();
  const { user, profile: viewerProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [worldStats, setWorldStats] = useState<VisitedWorldStats>({ citiesCount: 0, countriesCount: 0 });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [sharedStats, setSharedStats] = useState<{ count: number; km: number } | null>(null);

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
        const publicTrips = tripsSnap.docs.map((d) => d.data() as Trip);
        setTrips(publicTrips);
        fetchVisitedWorldStats(publicTrips.map((t) => t.id))
          .then(setWorldStats)
          .catch((err) => console.error("Impossibile calcolare il mondo visitato:", err));
      } catch (err) {
        console.error("Impossibile caricare il profilo:", err);
      }
      setLoadingProfile(false);
    })();
  }, [params.uid]);

  useEffect(() => {
    if (!user || user.uid === params.uid) {
      setIsFriend(false);
      return;
    }
    checkMutualFollow(user.uid, params.uid)
      .then(setIsFriend)
      .catch((err) => console.error("Impossibile verificare l'amicizia:", err));
  }, [user, params.uid]);

  // Viaggi e km fatti insieme: si parte SEMPRE dai viaggi a cui il
  // visitatore (io) ha accesso (i miei autorati + quelli a cui partecipo),
  // e per ciascuno si controlla se l'altro utente è l'autore o un
  // partecipante accettato. Il verso opposto (partire dai viaggi
  // dell'altro utente) non funzionerebbe per i suoi viaggi privati, che le
  // regole Firestore non permettono di interrogare dall'esterno.
  useEffect(() => {
    if (!user || !viewerProfile || user.uid === params.uid) {
      setSharedStats(null);
      return;
    }
    const targetUid = params.uid;
    (async () => {
      try {
        const db = getFirebaseDb();
        const authoredSnap = await getDocs(query(collection(db, "trips"), where("authorId", "==", user.uid)));
        const authoredTrips = authoredSnap.docs.map((d) => d.data() as Trip);

        const participantIds = viewerProfile.participantTripIds ?? [];
        const participantSnaps = await Promise.all(
          participantIds.map((id) =>
            getDoc(doc(db, "trips", id)).catch(() => null)
          )
        );
        const participantTrips = participantSnaps
          .filter((s): s is NonNullable<typeof s> => !!s && s.exists())
          .map((s) => s.data() as Trip);

        const viewerTrips = [...authoredTrips, ...participantTrips];

        const checks = await Promise.all(
          viewerTrips.map(async (trip) => {
            if (trip.authorId === targetUid) return trip;
            try {
              const pSnap = await getDoc(doc(db, "trips", trip.id, "participants", targetUid));
              if (pSnap.exists() && (pSnap.data() as { status?: string }).status === "accepted") return trip;
            } catch {
              // Non leggibile: non lo contiamo come condiviso.
            }
            return null;
          })
        );
        const shared = checks.filter((t): t is Trip => !!t);
        setSharedStats({
          count: shared.length,
          km: shared.reduce((sum, t) => sum + (t.totalDistanceKm ?? 0), 0),
        });
      } catch (err) {
        console.error("Impossibile calcolare i viaggi fatti insieme:", err);
        setSharedStats(null);
      }
    })();
  }, [user, viewerProfile, params.uid]);

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

  const badgeContext: BadgeContext = {
    stats: profile.stats,
    worldStats,
    dreamDestinationsCount: profile.dreamDestinations?.length ?? 0,
    interests: profile.interests,
  };
  const isSelf = user?.uid === profile.uid;
  const canSeePersonalInfo = isSelf || isFriend;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="card-surface mb-6 flex items-center gap-4 p-4 sm:p-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-50 ring-4 ring-brand-100">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.nickname} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brand-300">
              <FlamingoMascot className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-xl font-bold text-gray-900">@{profile.nickname}</h1>
          {canSeePersonalInfo ? (
            <>
              <p className="truncate text-sm font-semibold text-gray-500">{profile.displayName}</p>
              {profile.bio && <p className="text-sm text-gray-600">{profile.bio}</p>}
            </>
          ) : (
            <p className="text-xs text-gray-400">
              🔒 Seguitevi a vicenda per vedere nome e altri dati personali
            </p>
          )}
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

      {!isSelf && sharedStats && sharedStats.count > 0 && (
        <div className="card-surface mb-6 flex items-center gap-3 p-4 sm:p-5">
          <span className="text-2xl" aria-hidden>
            🧑‍🤝‍🧑
          </span>
          <div>
            <p className="font-heading font-bold text-gray-900">
              {sharedStats.count} {sharedStats.count === 1 ? "viaggio fatto insieme" : "viaggi fatti insieme"}
            </p>
            <p className="text-sm text-gray-500">{sharedStats.km.toFixed(0)} km percorsi insieme a @{profile.nickname}</p>
          </div>
        </div>
      )}

      <div className="card-surface mb-6 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold text-gray-700">💛 Interessi</h2>
          {!isSelf && viewerProfile && (
            <div className="flex items-center gap-2">
              <MatchGauge percent={computeMatchScore(viewerProfile.interests, profile.interests)} size={36} />
              <span className="text-xs font-semibold text-gray-500">di affinità con te</span>
            </div>
          )}
        </div>
        <ul className="flex flex-wrap gap-2">
          {INTEREST_KEYS.map((key) => (
            <li
              key={key}
              className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700"
            >
              <span aria-hidden>{INTEREST_ICONS[key]}</span>
              {INTEREST_LABELS[key]} · {profile.interests[key]}/10
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <BadgesShowcase ctx={badgeContext} />
      </div>

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
