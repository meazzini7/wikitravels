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
import { notifyFollowersOfNewTrip } from "@/lib/social";
import type { GeocodeResult } from "@/lib/geocoding";
import FlamingoMascot from "@/components/FlamingoMascot";
import PlaceSearch from "@/components/PlaceSearch";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-gray-100" />,
});

interface DraftStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
}

const STEP_LABELS = ["Dettagli", "Tappe", "Copertina", "Riepilogo"];

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

  function addStopFromPlace(place: GeocodeResult) {
    setStops((prev) => [
      ...prev,
      {
        id: generateId(),
        name: place.label.split(",").slice(0, 2).join(",").trim() || place.label,
        lat: place.lat,
        lng: place.lng,
        countryCode: place.countryCode,
      },
    ]);
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
        notifyFollowersOfNewTrip(user.uid, {
          tripId,
          tripTitle: title.trim(),
          authorDisplayName: profile?.displayName ?? user.displayName ?? user.email ?? "Viaggiatore",
          authorPhotoURL: profile?.photoURL ?? user.photoURL ?? null,
        }).catch((err) => console.error("Impossibile notificare i follower:", err));
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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Crea un nuovo viaggio</h1>
      <ol className="mb-6 flex flex-wrap gap-2 text-xs text-gray-500">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-brand-600 text-white" : "bg-gray-100"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
              Titolo
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Es. In giro per la Toscana"
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
              Descrizione
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-700">
                Data inizio
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-700">
                Data fine
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tripType" className="mb-1 block text-sm font-medium text-gray-700">
                Tipo di viaggio
              </label>
              <select
                id="tripType"
                value={tripType}
                onChange={(e) => setTripType(e.target.value as TripType)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {TRIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TRIP_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cost" className="mb-1 block text-sm font-medium text-gray-700">
                Costo indicativo (€)
              </label>
              <input
                id="cost"
                type="number"
                min={0}
                value={costEuro}
                onChange={(e) => setCostEuro(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Visibilità</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`min-h-[44px] flex-1 rounded-md border px-4 text-sm font-medium ${
                  visibility === "public"
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                🌍 Pubblico
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`min-h-[44px] flex-1 rounded-md border px-4 text-sm font-medium ${
                  visibility === "private"
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                🔒 Privato
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {visibility === "public"
                ? "Anteprima visibile a tutti, tappe e mappa solo a chi ha effettuato l'accesso."
                : "Visibile solo a te."}
            </p>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!canGoStep2}
            className="min-h-[44px] rounded-md bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            Avanti
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">Cerca una città o un luogo per aggiungerlo come tappa.</p>
          <PlaceSearch onSelect={addStopFromPlace} placeholder="Es. Firenze, Italia" />
          <TripMap stops={stops} className="h-72 w-full rounded-lg" />

          {stops.length > 0 && (
            <ol className="flex flex-col gap-2">
              {stops.map((stop, i) => (
                <li
                  key={stop.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
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
                      className="flex h-11 w-11 items-center justify-center text-gray-500 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStop(i, 1)}
                      disabled={i === stops.length - 1}
                      aria-label="Sposta giù"
                      className="flex h-11 w-11 items-center justify-center text-gray-500 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeStop(stop.id)}
                      aria-label="Rimuovi tappa"
                      className="flex h-11 w-11 items-center justify-center text-red-500"
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
              className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-4 font-medium text-gray-700"
            >
              Indietro
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canGoStep3}
              className="min-h-[44px] flex-1 rounded-md bg-brand-600 px-4 font-medium text-white disabled:opacity-40"
            >
              Avanti
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Genera una copertina suggestiva per il tuo viaggio con l&apos;AI, oppure salta questo passaggio.
          </p>
          <div className="relative h-48 w-full overflow-hidden rounded-lg bg-brand-50">
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
            className="min-h-[44px] rounded-md border border-brand-300 px-4 font-medium text-brand-700 disabled:opacity-40"
          >
            {coverLoading ? "Generazione in corso..." : cover ? "Rigenera copertina" : "Genera copertina con AI"}
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-4 font-medium text-gray-700"
            >
              Indietro
            </button>
            <button
              onClick={() => setStep(4)}
              className="min-h-[44px] flex-1 rounded-md bg-brand-600 px-4 font-medium text-white"
            >
              Avanti
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">
            {startDate} → {endDate} · {totalDistance.toFixed(0)} km · {stops.length} tappe
          </p>
          <p className="text-sm text-gray-600">
            {TRIP_TYPE_LABELS[tripType]} · {Number(costEuro) || 0}€ ·{" "}
            {visibility === "public" ? "🌍 Pubblico" : "🔒 Privato"}
          </p>
          {homeDistanceKm !== null && homeTravelHours !== null && (
            <p className="text-sm text-gray-600">
              Da casa ({homeLocation?.name}): circa {homeDistanceKm.toFixed(0)} km, {homeTravelHours.toFixed(1)} ore
            </p>
          )}
          <ol className="flex flex-col gap-2">
            {stops.map((stop, i) => (
              <li key={stop.id} className="text-sm text-gray-700">
                {i + 1}. {stop.name}
                {dateRanges[i] &&
                  ` (${formatISODate(dateRanges[i].start)} → ${formatISODate(dateRanges[i].end)})`}
              </li>
            ))}
          </ol>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-4 font-medium text-gray-700"
            >
              Indietro
            </button>
            <button
              onClick={publish}
              disabled={publishing}
              className="min-h-[44px] flex-1 rounded-md bg-brand-600 px-4 font-medium text-white disabled:opacity-40"
            >
              {publishing ? "Pubblicazione..." : "Pubblica viaggio"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
