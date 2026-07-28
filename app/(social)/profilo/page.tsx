"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import type { BadgeContext } from "@/lib/badges";
import { fetchVisitedWorldStats, visitedCountriesMap, type VisitedWorldStats } from "@/lib/world-stats";
import { destinationMatchKeys } from "@/lib/dream-destinations";
import { generateId } from "@/lib/id";
import { isNicknameTaken } from "@/lib/nickname";
import Link from "next/link";
import InterestSliders from "@/components/InterestSliders";
import PlaceSearch from "@/components/PlaceSearch";
import InviteShare from "@/components/InviteShare";
import FlamingoMascot from "@/components/FlamingoMascot";
import SimilarUsers from "@/components/SimilarUsers";
import BadgesShowcase from "@/components/BadgesShowcase";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import StatTile from "@/components/ui/StatTile";
import type { DreamDestination, HomeLocation, Trip } from "@/lib/types";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-gray-100" />,
});

export default function ProfiloPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [interests, setInterests] = useState<InterestScores>(defaultInterestScores());
  const [bio, setBio] = useState("");
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [dreamDestinations, setDreamDestinations] = useState<DreamDestination[]>([]);
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
      setDreamDestinations(profile.dreamDestinations ?? []);
      setNickname(profile.nickname ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      try {
        const db = getFirebaseDb();
        const authoredSnap = await getDocs(query(collection(db, "trips"), where("authorId", "==", user.uid)));
        const authoredTrips = authoredSnap.docs.map((d) => d.data() as Trip);

        // Viaggi altrui a cui si partecipa (invito accettato): contano
        // anch'essi per il mondo visitato, non solo quelli creati in prima
        // persona. Ogni lettura è isolata nel proprio catch: un singolo
        // viaggio non più leggibile (es. regole non ancora aggiornate sul
        // progetto live) non deve azzerare tutte le statistiche.
        const participantTripIds = profile.participantTripIds ?? [];
        const participantSnaps = await Promise.all(
          participantTripIds.map((id) =>
            getDoc(doc(db, "trips", id)).catch((err) => {
              console.error(`Impossibile leggere il viaggio partecipato ${id}:`, err);
              return null;
            })
          )
        );
        const participantTrips = participantSnaps
          .filter((s): s is NonNullable<typeof s> => !!s && s.exists())
          .map((s) => s.data() as Trip);

        const allTrips = [...authoredTrips, ...participantTrips];
        setMyTrips(allTrips);

        const allTripIds = allTrips.map((t) => t.id);
        const stats = await fetchVisitedWorldStats(allTripIds);
        setWorldStats(stats);
      } catch (err) {
        console.error("Impossibile caricare i tuoi viaggi:", err);
      }
    })();
  }, [user, profile]);

  const visitedMap = useMemo(() => visitedCountriesMap(myTrips), [myTrips]);

  function addDreamDestination(place: { label: string; lat: number; lng: number; countryCode: string }) {
    const name = place.label.split(",").slice(0, 2).join(",").trim() || place.label;
    setDreamDestinations((prev) => {
      const alreadyThere = prev.some(
        (d) => d.name.toLowerCase() === name.toLowerCase() && d.countryCode === place.countryCode
      );
      if (alreadyThere) return prev;
      return [...prev, { id: generateId(), name, lat: place.lat, lng: place.lng, countryCode: place.countryCode }];
    });
  }

  function removeDreamDestination(id: string) {
    setDreamDestinations((prev) => prev.filter((d) => d.id !== id));
  }

  async function save() {
    if (!user) return;
    setNicknameError(null);

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 3) {
      setNicknameError("Il nickname deve avere almeno 3 caratteri.");
      return;
    }
    if (!/^[a-z0-9_.]+$/i.test(trimmedNickname)) {
      setNicknameError("Solo lettere, numeri, punti e underscore.");
      return;
    }
    if (trimmedNickname !== profile?.nickname) {
      setCheckingNickname(true);
      const taken = await isNicknameTaken(trimmedNickname, user.uid);
      setCheckingNickname(false);
      if (taken) {
        setNicknameError("Questo nickname è già in uso, scegline un altro.");
        return;
      }
    }

    setSaving(true);
    setSaved(false);
    const dreamDestinationKeys = Array.from(
      new Set(dreamDestinations.flatMap((d) => destinationMatchKeys(d.name, d.countryCode)))
    );
    await updateDoc(doc(getFirebaseDb(), "users", user.uid), {
      interests,
      bio,
      homeLocation,
      dreamDestinations,
      dreamDestinationKeys,
      nickname: trimmedNickname,
      nicknameLower: trimmedNickname.toLowerCase(),
    });
    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <div className="h-40 w-full animate-pulse rounded-4xl bg-gray-100" />
      </main>
    );
  }
  if (!user) return null;
  if (!profile) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 text-center">
        <FlamingoMascot className="mx-auto mb-3 h-14 w-14 opacity-60" />
        <p className="text-gray-600">Non riesco a caricare il tuo profilo. Prova a ricaricare la pagina.</p>
      </main>
    );
  }

  const badgeContext: BadgeContext = {
    stats: profile.stats,
    worldStats,
    dreamDestinationsCount: dreamDestinations.length,
    interests,
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:py-8">
      <div className="relative mb-14">
        {/* L'avatar (sotto) deve "sporgere" fuori dal bordo inferiore della
            card: overflow-hidden va tenuto solo su questo div interno (per
            ritagliare il cerchio decorativo), non sul contenitore esterno,
            altrimenti taglierebbe via anche l'avatar. */}
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand-600 via-brand-500 to-lagoon-500 px-6 pb-14 pt-8 text-center text-white shadow-pop">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <p className="font-heading text-xl font-bold">{profile.displayName}</p>
          {profile.bio && <p className="mt-1 text-sm text-white/85">{profile.bio}</p>}
        </div>
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
        <BadgesShowcase ctx={badgeContext} />
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-sm font-bold text-gray-700">🌍 Il tuo mondo visitato</h2>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <StatTile icon="🏙️" value={worldStats.citiesCount} label="Città" tone="lagoon" />
          <StatTile icon="🗺️" value={worldStats.countriesCount} label="Nazioni" tone="lagoon" />
        </div>
        <WorldMap values={visitedMap} mode="binary" fitToValues className="h-56 w-full rounded-2xl" />
        {worldStats.citiesCount === 0 && (
          <p className="mt-3 text-center text-sm text-gray-500">
            La mappa si colora man mano che pubblichi viaggi con delle tappe ✈️
          </p>
        )}
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <label htmlFor="nickname" className="mb-1 block text-sm font-bold text-gray-700">
          🏷️ Nickname
        </label>
        <p className="mb-2 text-xs text-gray-500">
          Il tuo nome pubblico e univoco: è quello che vedono gli altri finché non vi seguite a vicenda. Solo
          lettere, numeri, punti e underscore.
        </p>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setNicknameError(null);
          }}
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
        />
        {nicknameError && <p className="mt-1 text-xs text-red-500">{nicknameError}</p>}
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
        <span className="mb-1 block text-sm font-bold text-gray-700">🌟 Le tue mete dei sogni</span>
        <p className="mb-2 text-xs text-gray-500">
          Ti avviseremo quando esce un nuovo viaggio o articolo su una di queste mete.
        </p>
        {dreamDestinations.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {dreamDestinations.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1.5 text-sm font-bold text-sun-700"
              >
                <span aria-hidden>✨</span>
                {d.name}
                <button
                  type="button"
                  onClick={() => removeDreamDestination(d.id)}
                  aria-label={`Rimuovi ${d.name} dalle mete dei sogni`}
                  className="tap-scale ml-0.5 text-sun-500 hover:text-sun-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <PlaceSearch placeholder="Es. Bali, Indonesia" onSelect={addDreamDestination} />
      </div>

      <div className="card-surface mb-6 p-4 sm:p-5">
        <h2 className="mb-3 font-heading text-sm font-bold text-gray-700">💛 I tuoi interessi</h2>
        <InterestSliders value={interests} onChange={setInterests} />
      </div>

      <div className="mb-6">
        <h2 className="mb-2 font-heading text-sm font-bold text-gray-700">👥 Persone come te</h2>
        <SimilarUsers currentUid={user.uid} interests={interests} />
      </div>

      <button
        onClick={save}
        disabled={saving || checkingNickname}
        className="tap-scale min-h-[48px] w-full rounded-2xl bg-brand-600 px-4 py-2 font-heading font-bold text-white shadow-pop disabled:opacity-60"
      >
        {checkingNickname ? "Verifica nickname..." : saving ? "Salvataggio..." : saved ? "Salvato ✓" : "Salva modifiche"}
      </button>

      <div className="card-surface mt-6 p-4 sm:p-5">
        <h2 className="mb-2 font-heading text-sm font-bold text-gray-700">🌐 Lingua</h2>
        <LanguageSwitcher />
      </div>

      <div className="card-surface mt-6 p-4 sm:p-5">
        <h2 className="mb-2 font-heading text-sm font-bold text-gray-700">📣 Invita altri viaggiatori</h2>
        <InviteShare uid={user.uid} code={profile.referralCode ?? null} />
      </div>
    </main>
  );
}
