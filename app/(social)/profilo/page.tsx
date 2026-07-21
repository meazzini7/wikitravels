"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import { unlockedBadges } from "@/lib/badges";
import { fetchVisitedWorldStats, visitedCountriesMap, type VisitedWorldStats } from "@/lib/world-stats";
import Link from "next/link";
import InterestSliders from "@/components/InterestSliders";
import PlaceSearch from "@/components/PlaceSearch";
import InviteShare from "@/components/InviteShare";
import FlamingoMascot from "@/components/FlamingoMascot";
import StatTile from "@/components/ui/StatTile";
import { BADGES } from "@/lib/badges";
import type { HomeLocation, Trip } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-100" />,
});

export default function ProfiloPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [interests, setInterests] = useState<InterestScores>(defaultInterestScores());
  const [bio, setBio] = useState("");
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [worldStats, setWorldStats] = useState<VisitedWorldStats>({ citiesCount: 0, countriesCount: 0 });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setInterests(profile.interests ?? defaultInterestScores());
      setBio(profile.bio ?? "");
      setHomeLocation(profile.homeLocation ?? null);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(getFirebaseDb(), "trips"), where("authorId", "==", user.uid)))
      .then((snap) => setMyTrips(snap.docs.map((d) => d.data() as Trip)))
      .catch((err) => console.error("Impossibile caricare i tuoi viaggi:", err));
    fetchVisitedWorldStats(user.uid)
      .then(setWorldStats)
      .catch((err) => console.error("Impossibile calcolare il mondo visitato:", err));
  }, [user]);

  const visitedMap = useMemo(() => visitedCountriesMap(myTrips), [myTrips]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await updateDoc(doc(getFirebaseDb(), "users", user.uid), { interests, bio, homeLocation });
    setSaving(false);
    setSaved(true);
  }

  if (loading || !user || !profile) return null;

  const badges = unlockedBadges(profile.stats);

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <div className="relative mb-14 overflow-hidden rounded-4xl bg-gradient-to-br from-brand-600 via-brand-500 to-lagoon-500 px-6 pb-14 pt-8 text-center text-white shadow-pop">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <p className="font-heading text-xl font-bold">{profile.displayName}</p>
        {profile.bio && <p className="mt-1 text-sm text-white/85">{profile.bio}</p>}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-brand-50 shadow-lg">
            {profile.photoURL ? (
              <Image src={profile.photoURL} alt={profile.displayName} fill className="object-cover" sizes="80px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-brand-300">
                <FlamingoMascot className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        <StatTile icon="🧳" value={profile.stats.tripsCount} label="Viaggi" />
        <StatTile icon="📏" value={profile.stats.totalDistanceKm.toFixed(0)} label="km" tone="lagoon" />
        <StatTile icon="⭐" value={profile.stats.followersCount} label="Follower" tone="sun" />
        <StatTile icon="🤝" value={profile.stats.followingCount} label="Seguiti" />
      </div>

      {profile.stats.tripsCount === 0 && (
        <Link
          href="/viaggi/nuovo"
          className="tap-scale mb-6 flex items-center gap-3 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50 p-4"
        >
          <span className="text-2xl" aria-hidden>
            🧳
          </span>
          <div className="flex-1">
            <p className="font-heading font-bold text-brand-700">Non hai ancora pubblicato un viaggio</p>
            <p className="text-sm text-brand-600">Tocca qui per creare il tuo primo!</p>
          </div>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className="mb-6">
        <h2 className="mb-2 font-heading text-sm font-bold text-gray-700">🏅 Badge</h2>
        {badges.length > 0 ? (
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
        ) : (
          <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
            {BADGES[0].icon} Pubblica il tuo primo viaggio per sbloccare &quot;{BADGES[0].label}&quot;!
          </p>
        )}
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-sm font-bold text-gray-700">🌍 Il tuo mondo visitato</h2>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <StatTile icon="🏙️" value={worldStats.citiesCount} label="Città" tone="lagoon" />
          <StatTile icon="🗺️" value={worldStats.countriesCount} label="Nazioni" tone="lagoon" />
        </div>
        <WorldMap values={visitedMap} mode="binary" className="h-56 w-full rounded-2xl" />
        {worldStats.citiesCount === 0 && (
          <p className="mt-3 text-center text-sm text-gray-500">
            La mappa si colora man mano che pubblichi viaggi con delle tappe ✈️
          </p>
        )}
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <label htmlFor="bio" className="mb-1 block text-sm font-bold text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
        />
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <span className="mb-1 block text-sm font-bold text-gray-700">🏠 Punto di partenza</span>
        <p className="mb-2 text-xs text-gray-500">
          Usato per calcolare km e ore indicative da casa nei tuoi viaggi.
        </p>
        <PlaceSearch
          initialValue={homeLocation?.name ?? ""}
          placeholder="Es. Milano, Italia"
          onSelect={(place) =>
            setHomeLocation({
              name: place.label.split(",").slice(0, 2).join(",").trim() || place.label,
              lat: place.lat,
              lng: place.lng,
              countryCode: place.countryCode,
            })
          }
        />
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-sm font-bold text-gray-700">💛 I tuoi interessi</h2>
        <InterestSliders value={interests} onChange={setInterests} />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="tap-scale min-h-[48px] w-full rounded-2xl bg-brand-600 px-4 py-2 font-heading font-bold text-white shadow-pop disabled:opacity-60"
      >
        {saving ? "Salvataggio..." : saved ? "Salvato ✓" : "Salva modifiche"}
      </button>

      <div className="card-surface mt-6 p-4 sm:p-5">
        <h2 className="mb-2 font-heading text-sm font-bold text-gray-700">📣 Invita altri viaggiatori</h2>
        <InviteShare uid={user.uid} />
      </div>
    </main>
  );
}
