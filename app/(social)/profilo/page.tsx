"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import { unlockedBadges } from "@/lib/badges";
import { fetchVisitedWorldStats, visitedCountriesMap, type VisitedWorldStats } from "@/lib/world-stats";
import InterestSliders from "@/components/InterestSliders";
import PlaceSearch from "@/components/PlaceSearch";
import InviteShare from "@/components/InviteShare";
import type { HomeLocation, Trip } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-gray-100" />,
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
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Il tuo profilo</h1>

      <div className="mb-6 grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.tripsCount}</p>
          <p className="text-xs text-gray-500">Viaggi</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.totalDistanceKm.toFixed(0)}</p>
          <p className="text-xs text-gray-500">km</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.followersCount}</p>
          <p className="text-xs text-gray-500">Follower</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.followingCount}</p>
          <p className="text-xs text-gray-500">Seguiti</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Badge</h2>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.id}
                title={b.description}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
              >
                <span aria-hidden>{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Il tuo mondo visitato</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-lagoon-600">{worldStats.citiesCount}</p>
            <p className="text-xs text-gray-500">Città</p>
          </div>
          <div>
            <p className="text-lg font-bold text-lagoon-600">{worldStats.countriesCount}</p>
            <p className="text-xs text-gray-500">Nazioni</p>
          </div>
        </div>
        <WorldMap values={visitedMap} mode="binary" className="h-64 w-full rounded-lg" />
      </div>

      <div className="mb-6">
        <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="mb-6">
        <span className="mb-1 block text-sm font-medium text-gray-700">Punto di partenza</span>
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

      <h2 className="mb-2 text-sm font-semibold text-gray-700">I tuoi interessi</h2>
      <InterestSliders value={interests} onChange={setInterests} />

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 min-h-[44px] w-full rounded-md bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {saving ? "Salvataggio..." : saved ? "Salvato ✓" : "Salva modifiche"}
      </button>

      <div className="mt-8 border-t border-gray-100 pt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Invita altri viaggiatori</h2>
        <InviteShare uid={user.uid} />
      </div>
    </main>
  );
}
