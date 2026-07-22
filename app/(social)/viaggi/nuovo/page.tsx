"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { doc, increment, writeBatch } from "firebase/firestore";
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
import { defaultInterestScores } from "@/lib/interests";
import { TRIP_TYPES, TRIP_TYPE_LABELS, type TripType } from "@/lib/trip-types";
import { notifyDreamDestinationMatches, notifyFollowersOfNewTrip } from "@/lib/social";
import type { GeocodeResult } from "@/lib/geocoding";
import FlamingoMascot from "@/components/FlamingoMascot";
import PlaceSearch from "@/components/PlaceSearch";
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

export default function NuovoViaggioPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [tripId] = useState(() => generateId());
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("solo");
  const [costEuro, setCostEuro] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const [stops, setStops] = useState<DraftStop[]>([]);

  const [cover, setCover] = useState<{ url: string; author: string; link: string } | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

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
    setStops((prev) => [...prev, { id: generateId(), name, lat, lng, countryCode }]);
  }

  function addStopFromPlace(place: GeocodeResult) {
    addStop(place.label.split(",").slice(0, 2).join(",").trim() || place.label, place.lat, place.lng, place.countryCode);
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
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
        body: JSON.stringify({ title, description, tripId }),
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
      batch.set(tripRef, {
        id: tripId,
        authorId: user.uid,
        authorDisplayName: profile?.displayName ?? user.displayName ?? user.email ?? "Viaggiatore",
        authorPhotoURL: profile?.photoURL ?? user.photoURL ?? null,
        authorInterests: profile?.interests ?? defaultInterestScores(),
        title: title.trim(),
        description: description.trim(),
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
        status: "published",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
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
        });
      });
      batch.update(doc(db, "users", user.uid), {
        "stats.tripsCount": increment(1),
        "stats.totalDistanceKm": increment(totalDistance),
      });
      await batch.commit();

      if (visibility === "public") {
        const tripInfo = {
          tripId,
          tripTitle: title.trim(),
          authorDisplayName: profile?.displayName ?? user.displayName ?? user.email ?? "Viaggiatore",
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
      setError("Non sono riuscito a pubblicare il viaggio. Riprova.");
      setPublishing(false);
    }
  }

  const canGoStep2 = title.trim().length > 0 && !!startDate && !!endDate && startDate <= endDate;
  const canGoStep3 = stops.length >= 1;

  if (loading || !user) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="mb-4 text-center font-heading text-2xl font-bold text-gray-900">
        Crea un nuovo viaggio ✈️
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
            <label htmlFor="description" className="mb-1 block text-sm font-bold text-gray-700">
              Descrizione
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
            />
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
                className="w-full rounded-2xl border-2 border-gray-200 px-3 py-2.5 focus:border-brand-400 focus:outline-none"
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
                className="w-full rounded-2xl border-2 border-gray-200 px-3 py-2.5 focus:border-brand-400 focus:outline-none"
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
                <li
                  key={stop.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">
                      {i + 1}. {stop.name}
                    </p>
                    {dateRanges[i] && (
                      <p className="text-xs text-gray-500">
                        {formatISODate(dateRanges[i].start)} → {formatISODate(dateRanges[i].end)}
                      </p>
                    )}
                  </div>
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
