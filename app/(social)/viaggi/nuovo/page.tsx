"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, increment, orderBy, query, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { generateId } from "@/lib/id";
import {
  distributeDates,
  estimateTravelHours,
  formatISODate,
  haversineDistanceKm,
  totalTripDistanceKm,
} from "@/lib/travel-utils";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import { TRIP_TYPES, TRIP_TYPE_LABELS, type TripType } from "@/lib/trip-types";
import { notifyDreamDestinationMatches, notifyFollowersOfNewTrip } from "@/lib/social";
import type { GeocodeResult } from "@/lib/geocoding";
import type { PoiRating, Trip, TripStop } from "@/lib/types";
import FlamingoMascot from "@/components/FlamingoMascot";
import PlaceSearch from "@/components/PlaceSearch";
import PoiPicker from "@/components/PoiPicker";
import InterestSliders from "@/components/InterestSliders";
import ProgressStepper from "@/components/ui/ProgressStepper";
import ChipToggle from "@/components/ui/ChipToggle";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-gray-100" />,
});

interface DraftStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  poiRatings: PoiRating[];
}

const STEPS = [
  { label: "Dettagli", icon: "📝" },
  { label: "Tappe", icon: "📍" },
  { label: "Copertina", icon: "🖼️" },
  { label: "Riepilogo", icon: "🎉" },
];

const TRIP_TYPE_ICONS: Record<TripType, string> = {
  solo: "🧍",
  coppia: "💑",
  amici: "👯",
  famiglia: "👨‍👩‍👧",
  gruppo: "👥",
};

const QUICK_DESTINATIONS: { name: string; lat: number; lng: number; countryCode: string }[] = [
  { name: "Roma, Italia", lat: 41.9028, lng: 12.4964, countryCode: "it" },
  { name: "Parigi, Francia", lat: 48.8566, lng: 2.3522, countryCode: "fr" },
  { name: "Barcellona, Spagna", lat: 41.3851, lng: 2.1734, countryCode: "es" },
  { name: "Londra, Regno Unito", lat: 51.5072, lng: -0.1276, countryCode: "gb" },
  { name: "New York, USA", lat: 40.7128, lng: -74.006, countryCode: "us" },
  { name: "Bali, Indonesia", lat: -8.65, lng: 115.2167, countryCode: "id" },
  { name: "Tokyo, Giappone", lat: 35.6762, lng: 139.6503, countryCode: "jp" },
];

// useSearchParams() (per la modalità modifica "?edit=") richiede un
// confine Suspense: senza, la navigazione client-side verso questa pagina
// (es. dal bottone "Modifica" nella pagina del viaggio) può comportarsi in
// modo incoerente tra browser diversi invece di limitarsi a un semplice
// avviso in fase di build.
export default function NuovoViaggioPageRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
          <div className="h-96 w-full animate-pulse rounded-3xl bg-gray-100" />
        </main>
      }
    >
      <NuovoViaggioPage />
    </Suspense>
  );
}

function NuovoViaggioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTripId = searchParams.get("edit");
  const { user, profile, loading } = useAuth();
  const [tripId] = useState(() => editTripId ?? generateId());
  const [step, setStep] = useState(1);
  const [loadingExisting, setLoadingExisting] = useState(!!editTripId);

  const [title, setTitle] = useState("");
  const [tripScores, setTripScores] = useState<InterestScores>(defaultInterestScores());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("solo");
  const [costEuro, setCostEuro] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const [stops, setStops] = useState<DraftStop[]>([]);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [originalStopIds, setOriginalStopIds] = useState<string[]>([]);
  const [originalTotalDistanceKm, setOriginalTotalDistanceKm] = useState(0);

  const [cover, setCover] = useState<{ url: string; author: string; link: string } | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Per un viaggio nuovo, parte dai propri interessi generali come punto di
  // partenza (restano comunque modificabili per questo specifico viaggio).
  useEffect(() => {
    if (!editTripId && profile) setTripScores(profile.interests ?? defaultInterestScores());
  }, [editTripId, profile]);

  // Modalità modifica: precarica il viaggio esistente e le sue tappe.
  useEffect(() => {
    if (!editTripId || !user) return;
    const db = getFirebaseDb();
    (async () => {
      try {
        const tripSnap = await getDoc(doc(db, "trips", editTripId));
        if (!tripSnap.exists()) {
          setError("Viaggio non trovato.");
          return;
        }
        const existing = tripSnap.data() as Trip;
        if (existing.authorId !== user.uid) {
          setError("Non puoi modificare un viaggio che non è tuo.");
          return;
        }
        setTitle(existing.title);
        setTripScores(existing.scores ?? existing.authorInterests ?? defaultInterestScores());
        setStartDate(existing.startDate);
        setEndDate(existing.endDate);
        setTripType(existing.tripType);
        setCostEuro(existing.costEuro ? String(existing.costEuro) : "");
        setVisibility(existing.visibility);
        setOriginalTotalDistanceKm(existing.totalDistanceKm);
        if (existing.coverImageUrl) {
          setCover({ url: existing.coverImageUrl, author: "", link: "" });
        }

        const stopsSnap = await getDocs(
          query(collection(db, "trips", editTripId, "stops"), orderBy("order", "asc"))
        );
        const loadedStops = stopsSnap.docs.map((d) => {
          const s = d.data() as TripStop;
          return {
            id: s.id,
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            countryCode: s.countryCode,
            poiRatings: s.poiRatings ?? [],
          };
        });
        setStops(loadedStops);
        setOriginalStopIds(loadedStops.map((s) => s.id));
      } catch (err) {
        console.error("Impossibile caricare il viaggio da modificare:", err);
        setError("Non sono riuscito a caricare il viaggio da modificare.");
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [editTripId, user]);

  const totalDistance = useMemo(() => totalTripDistanceKm(stops), [stops]);
  const dateRanges = useMemo(() => {
    if (!startDate || !endDate || stops.length === 0) return [];
    return distributeDates(new Date(startDate), new Date(endDate), stops.length);
  }, [startDate, endDate, stops.length]);

  const homeLocation = profile?.homeLocation ?? null;
  const homeDistanceKm = useMemo(() => {
    if (!homeLocation || stops.length === 0) return null;
    return haversineDistanceKm(homeLocation, stops[0]);
  }, [homeLocation, stops]);
  const homeTravelHours = homeDistanceKm !== null ? estimateTravelHours(homeDistanceKm) : null;

  function addStop(name: string, lat: number, lng: number, countryCode: string) {
    setStops((prev) => [...prev, { id: generateId(), name, lat, lng, countryCode, poiRatings: [] }]);
  }

  function addStopFromPlace(place: GeocodeResult) {
    addStop(place.label.split(",").slice(0, 2).join(",").trim() || place.label, place.lat, place.lng, place.countryCode);
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function setStopPoiRatings(id: string, poiRatings: PoiRating[]) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, poiRatings } : s)));
  }

  function moveStop(index: number, dir: -1 | 1) {
    setStops((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function generateCover() {
    if (!user) return;
    setCoverLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/trips/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ title, destinations: stops.map((s) => s.name), tripId }),
      });
      if (!res.ok) throw new Error("cover-failed");
      const data = await res.json();
      setCover(data.image);
    } catch {
      setError("Non sono riuscito a generare la copertina. Riprova.");
    } finally {
      setCoverLoading(false);
    }
  }

  async function publish() {
    if (!user) return;
    setPublishing(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const tripRef = doc(db, "trips", tripId);
      const countryCodes = Array.from(new Set(stops.map((s) => s.countryCode).filter(Boolean)));
      const tripFields = {
        authorId: user.uid,
        authorDisplayName: profile?.displayName ?? user.displayName ?? user.email ?? "Viaggiatore",
        authorNickname: profile?.nickname ?? "viaggiatore",
        authorPhotoURL: profile?.photoURL ?? user.photoURL ?? null,
        authorInterests: profile?.interests ?? defaultInterestScores(),
        scores: tripScores,
        title: title.trim(),
        startDate,
        endDate,
        coverImageUrl: cover?.url ?? null,
        totalDistanceKm: totalDistance,
        visibility,
        tripType,
        costEuro: Number(costEuro) || 0,
        countryCodes,
        homeDistanceKm,
        homeTravelHours,
        updatedAt: Date.now(),
      };

      if (editTripId) {
        batch.update(tripRef, tripFields);
        const removedStopIds = originalStopIds.filter((id) => !stops.some((s) => s.id === id));
        removedStopIds.forEach((id) => batch.delete(doc(db, "trips", tripId, "stops", id)));
      } else {
        batch.set(tripRef, { id: tripId, status: "published", createdAt: Date.now(), ...tripFields });
      }

      stops.forEach((stop, i) => {
        const range = dateRanges[i];
        batch.set(doc(db, "trips", tripId, "stops", stop.id), {
          id: stop.id,
          authorId: user.uid,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          countryCode: stop.countryCode,
          order: i,
          startDate: range ? formatISODate(range.start) : startDate,
          endDate: range ? formatISODate(range.end) : endDate,
          poiRatings: stop.poiRatings,
        });
      });

      if (editTripId) {
        batch.update(doc(db, "users", user.uid), {
          "stats.totalDistanceKm": increment(totalDistance - originalTotalDistanceKm),
        });
      } else {
        batch.update(doc(db, "users", user.uid), {
          "stats.tripsCount": increment(1),
          "stats.totalDistanceKm": increment(totalDistance),
        });
      }
      await batch.commit();

      if (!editTripId && visibility === "public") {
        const tripInfo = {
          tripId,
          tripTitle: title.trim(),
          authorNickname: profile?.nickname ?? "viaggiatore",
          authorPhotoURL: profile?.photoURL ?? user.photoURL ?? null,
        };
        notifyFollowersOfNewTrip(user.uid, tripInfo).catch((err) =>
          console.error("Impossibile notificare i follower:", err)
        );
        notifyDreamDestinationMatches(user.uid, tripInfo, stops).catch((err) =>
          console.error("Impossibile notificare le mete dei sogni:", err)
        );
      }

      router.push(`/viaggi/${tripId}`);
    } catch {
      setError(
        editTripId ? "Non sono riuscito a salvare le modifiche. Riprova." : "Non sono riuscito a pubblicare il viaggio. Riprova."
      );
      setPublishing(false);
    }
  }

  const canGoStep2 = title.trim().length > 0 && !!startDate && !!endDate && startDate <= endDate;
  const canGoStep3 = stops.length >= 1;

  if (loading || !user) return null;
  if (loadingExisting) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="h-96 w-full animate-pulse rounded-3xl bg-gray-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="mb-4 text-center font-heading text-2xl font-bold text-gray-900">
        {editTripId ? "Modifica il tuo viaggio ✏️" : "Crea un nuovo viaggio ✈️"}
      </h1>
      <ProgressStepper steps={STEPS} current={step} />

      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">{error}</p>
      )}

      {step === 1 && (
        <div className="card-surface flex flex-col gap-5 p-4 sm:p-6">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-bold text-gray-700">
              Titolo
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
              placeholder="Es. In giro per la Toscana"
            />
          </div>
          <div>
            <span className="mb-1 block text-sm font-bold text-gray-700">💛 Interessi di questo viaggio</span>
            <p className="mb-2 text-xs text-gray-500">
              Non sempre coincidono con i tuoi interessi generali: usali per far trovare questo viaggio a chi cerca
              esattamente questo tipo di esperienza.
            </p>
            <InterestSliders value={tripScores} onChange={setTripScores} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startDate" className="mb-1 block text-sm font-bold text-gray-700">
                Data inizio
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-[48px] w-full rounded-2xl border-2 border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="mb-1 block text-sm font-bold text-gray-700">
                Data fine
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="min-h-[48px] w-full rounded-2xl border-2 border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-bold text-gray-700">Con chi parti?</span>
            <ChipToggle
              value={tripType}
              onChange={setTripType}
              columns={5}
              options={TRIP_TYPES.map((t) => ({ value: t, label: TRIP_TYPE_LABELS[t].replace("In ", "").replace("Da ", ""), icon: TRIP_TYPE_ICONS[t] }))}
            />
          </div>

          <div>
            <label htmlFor="cost" className="mb-2 block text-sm font-bold text-gray-700">
              Costo indicativo
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {[300, 800, 1500, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCostEuro(String(preset))}
                  className="tap-scale rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-brand-50 hover:text-brand-700"
                >
                  {preset}€
                </button>
              ))}
            </div>
            <input
              id="cost"
              type="number"
              min={0}
              value={costEuro}
              onChange={(e) => setCostEuro(e.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
              placeholder="0€"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-bold text-gray-700">Visibilità</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`tap-scale flex min-h-[52px] flex-col items-center justify-center rounded-2xl border-2 text-sm font-bold ${
                  visibility === "public"
                    ? "border-brand-600 bg-brand-50 text-brand-700 shadow-pop"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                🌍 Pubblico
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`tap-scale flex min-h-[52px] flex-col items-center justify-center rounded-2xl border-2 text-sm font-bold ${
                  visibility === "private"
                    ? "border-brand-600 bg-brand-50 text-brand-700 shadow-pop"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                🔒 Privato
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              {visibility === "public"
                ? "Anteprima visibile a tutti, tappe e mappa solo a chi ha effettuato l'accesso."
                : "Visibile solo a te."}
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canGoStep2}
            className="tap-scale min-h-[48px] rounded-2xl bg-brand-600 px-4 py-2 font-heading font-bold text-white shadow-pop disabled:opacity-40"
          >
            Avanti →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card-surface flex flex-col gap-4 p-4 sm:p-6">
          <p className="text-sm font-semibold text-gray-600">Tocca una meta popolare o cerca un luogo:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_DESTINATIONS.map((dest) => (
              <button
                key={dest.name}
                type="button"
                onClick={() => addStop(dest.name, dest.lat, dest.lng, dest.countryCode)}
                className="tap-scale rounded-full bg-lagoon-50 px-3 py-1.5 text-xs font-bold text-lagoon-700 hover:bg-lagoon-100"
              >
                + {dest.name.split(",")[0]}
              </button>
            ))}
          </div>
          <PlaceSearch onSelect={addStopFromPlace} placeholder="Oppure cerca un altro luogo..." />
          <TripMap stops={stops} className="h-64 w-full rounded-2xl" />

          {stops.length > 0 && (
            <ol className="flex flex-col gap-2">
              {stops.map((stop, i) => (
                <li key={stop.id} className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedStopId((prev) => (prev === stop.id ? null : stop.id))}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate font-bold text-gray-900">
                        {i + 1}. {stop.name}
                        {stop.poiRatings.length > 0 && (
                          <span className="ml-1.5 text-xs font-semibold text-brand-600">
                            📍 {stop.poiRatings.length}
                          </span>
                        )}
                      </p>
                      {dateRanges[i] && (
                        <p className="text-xs text-gray-500">
                          {formatISODate(dateRanges[i].start)} → {formatISODate(dateRanges[i].end)}
                        </p>
                      )}
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => moveStop(i, -1)}
                        disabled={i === 0}
                        aria-label="Sposta su"
                        className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStop(i, 1)}
                        disabled={i === stops.length - 1}
                        aria-label="Sposta giù"
                        className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeStop(stop.id)}
                        aria-label="Rimuovi tappa"
                        className="tap-scale flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {expandedStopId === stop.id && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <PoiPicker
                        placeName={stop.name}
                        value={stop.poiRatings}
                        onChange={(ratings) => setStopPoiRatings(stop.id, ratings)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {stops.length > 1 && (
            <p className="text-sm text-gray-600">
              Distanza totale stimata: <strong>{totalDistance.toFixed(0)} km</strong>
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl border-2 border-gray-200 px-4 font-bold text-gray-700"
            >
              ← Indietro
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canGoStep3}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl bg-brand-600 px-4 font-heading font-bold text-white shadow-pop disabled:opacity-40"
            >
              Avanti →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card-surface flex flex-col gap-4 p-4 sm:p-6">
          <p className="text-sm font-semibold text-gray-600">
            Genera una copertina suggestiva per il tuo viaggio con l&apos;AI, oppure salta questo passaggio.
          </p>
          <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-lagoon-100">
            {cover ? (
              <Image src={cover.url} alt={title} fill className="object-cover" sizes="512px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-brand-300">
                <FlamingoMascot className="h-16 w-16" />
              </div>
            )}
          </div>
          <button
            onClick={generateCover}
            disabled={coverLoading || !title.trim()}
            className="tap-scale min-h-[48px] rounded-2xl border-2 border-brand-300 px-4 font-bold text-brand-700 disabled:opacity-40"
          >
            {coverLoading ? "✨ Generazione in corso..." : cover ? "🔄 Rigenera copertina" : "✨ Genera copertina con AI"}
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl border-2 border-gray-200 px-4 font-bold text-gray-700"
            >
              ← Indietro
            </button>
            <button
              onClick={() => setStep(4)}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl bg-brand-600 px-4 font-heading font-bold text-white shadow-pop"
            >
              Avanti →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card-surface flex flex-col gap-4 p-4 sm:p-6">
          <div className="text-center">
            <p className="text-3xl">🎉</p>
            <h2 className="font-heading text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Tutto pronto per partire!</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-brand-50 px-3 py-2">
              <p className="font-heading font-bold text-brand-700">{totalDistance.toFixed(0)} km</p>
              <p className="text-[11px] text-brand-600">{stops.length} tappe</p>
            </div>
            <div className="rounded-2xl bg-lagoon-50 px-3 py-2">
              <p className="font-heading font-bold text-lagoon-700">
                {TRIP_TYPE_ICONS[tripType]} {Number(costEuro) || 0}€
              </p>
              <p className="text-[11px] text-lagoon-600">{visibility === "public" ? "🌍 Pubblico" : "🔒 Privato"}</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">
            {startDate} → {endDate}
          </p>
          {homeDistanceKm !== null && homeTravelHours !== null && (
            <p className="text-center text-sm text-gray-500">
              Da casa ({homeLocation?.name}): circa {homeDistanceKm.toFixed(0)} km, {homeTravelHours.toFixed(1)} ore
            </p>
          )}
          <ol className="flex flex-col gap-1.5">
            {stops.map((stop, i) => (
              <li key={stop.id} className="rounded-xl bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                📍 {i + 1}. {stop.name}
                {dateRanges[i] &&
                  ` (${formatISODate(dateRanges[i].start)} → ${formatISODate(dateRanges[i].end)})`}
              </li>
            ))}
          </ol>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl border-2 border-gray-200 px-4 font-bold text-gray-700"
            >
              ← Indietro
            </button>
            <button
              onClick={publish}
              disabled={publishing}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl bg-brand-600 px-4 font-heading font-bold text-white shadow-pop disabled:opacity-40"
            >
              {publishing ? "Pubblicazione..." : "🚀 Pubblica viaggio"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
