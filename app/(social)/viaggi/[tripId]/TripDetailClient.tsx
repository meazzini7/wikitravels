"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { collection, doc, getDoc, getDocs, increment, orderBy, query, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { TRIP_TYPE_LABELS } from "@/lib/trip-types";
import { INTEREST_ICONS, INTEREST_LABELS, topInterests } from "@/lib/interests";
import FlamingoMascot from "@/components/FlamingoMascot";
import TripParticipants from "@/components/TripParticipants";
import type { Trip, TripStop } from "@/lib/types";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-gray-100" />,
});

export default function TripDetailClient() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // jsPDF pesa parecchio (è la libreria più pesante di tutta l'app): la
  // si carica solo quando l'utente tocca davvero "Esporta PDF", invece di
  // scaricarla per ogni visita a una pagina di viaggio, quando la stragrande
  // maggioranza di chi la visita non esporta mai nulla.
  async function handleExportPdf() {
    if (!trip) return;
    setExportingPdf(true);
    try {
      const { exportTripPdf } = await import("@/lib/export-trip-pdf");
      exportTripPdf(trip, stops);
    } finally {
      setExportingPdf(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    const db = getFirebaseDb();
    const tripId = params.tripId;
    (async () => {
      try {
        const tripSnap = await getDoc(doc(db, "trips", tripId));
        if (!tripSnap.exists()) {
          setNotFound(true);
          return;
        }
        setTrip(tripSnap.data() as Trip);

        if (user) {
          const stopsSnap = await getDocs(
            query(collection(db, "trips", tripId, "stops"), orderBy("order", "asc"))
          );
          setStops(stopsSnap.docs.map((d) => d.data() as TripStop));
        }
      } catch (err) {
        console.error("Impossibile caricare il viaggio:", err);
        setNotFound(true);
      } finally {
        setLoadingTrip(false);
      }
    })();
  }, [params.tripId, user, authLoading]);

  if (loadingTrip || authLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-56 w-full animate-pulse rounded-3xl bg-gray-100" />
      </main>
    );
  }
  if (notFound || !trip) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <FlamingoMascot className="mx-auto mb-3 h-14 w-14 opacity-60" />
        <p className="text-gray-500">Viaggio non trovato.</p>
      </main>
    );
  }

  const isOwner = user?.uid === trip.authorId;

  async function deleteTrip() {
    if (!user || !trip) return;
    if (!window.confirm("Eliminare definitivamente questo viaggio? L'azione non si può annullare.")) return;
    setDeleting(true);
    try {
      const db = getFirebaseDb();
      const batch = writeBatch(db);
      const stopsSnap = await getDocs(collection(db, "trips", trip.id, "stops"));
      stopsSnap.docs.forEach((d) => batch.delete(d.ref));
      const participantsSnap = await getDocs(collection(db, "trips", trip.id, "participants"));
      participantsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "trips", trip.id));
      batch.update(doc(db, "users", user.uid), {
        "stats.tripsCount": increment(-1),
        "stats.totalDistanceKm": increment(-trip.totalDistanceKm),
      });
      await batch.commit();
      router.push("/profilo");
    } catch (err) {
      console.error("Impossibile eliminare il viaggio:", err);
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="relative mb-4 h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-200 to-lagoon-200 shadow-soft sm:h-72">
        {trip.coverImageUrl ? (
          <Image src={trip.coverImageUrl} alt={trip.title} fill className="object-cover" sizes="768px" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-400">
            <FlamingoMascot className="h-20 w-20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <h1 className="font-heading text-2xl font-extrabold drop-shadow sm:text-3xl">{trip.title}</h1>
            <p className="text-sm font-semibold text-white/90">
              {trip.startDate} → {trip.endDate}
            </p>
          </div>
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
            {trip.visibility === "public" ? "🌍 Pubblico" : "🔒 Privato"}
          </span>
        </div>
      </div>

      <Link
        href={`/utenti/${trip.authorId}`}
        className="tap-scale mb-4 flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline"
      >
        <span aria-hidden>🦩</span>
        Viaggio di @{trip.authorNickname ?? trip.authorDisplayName}
      </Link>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl bg-brand-50 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-brand-700">{trip.totalDistanceKm.toFixed(0)}</p>
          <p className="text-[10px] font-semibold text-brand-600">km</p>
        </div>
        <div className="rounded-2xl bg-lagoon-50 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-lagoon-700">{stops.length || "—"}</p>
          <p className="text-[10px] font-semibold text-lagoon-600">tappe</p>
        </div>
        <div className="rounded-2xl bg-sun-50 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-sun-700">{TRIP_TYPE_LABELS[trip.tripType]}</p>
          <p className="text-[10px] font-semibold text-sun-700">tipo</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-2 py-2.5">
          <p className="font-heading text-sm font-extrabold text-gray-700">{trip.costEuro ? `${trip.costEuro}€` : "—"}</p>
          <p className="text-[10px] font-semibold text-gray-500">costo</p>
        </div>
      </div>

      {trip.homeDistanceKm !== null && trip.homeTravelHours !== null && (
        <p className="mb-4 rounded-2xl bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
          🏠 Da casa: circa {trip.homeDistanceKm.toFixed(0)} km, {trip.homeTravelHours.toFixed(1)} ore
        </p>
      )}

      {trip.scores && (
        <ul className="mb-4 flex flex-wrap gap-1.5">
          {topInterests(trip.scores, 3).map((key) => (
            <li
              key={key}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"
            >
              <span aria-hidden>{INTEREST_ICONS[key]}</span>
              {INTEREST_LABELS[key]}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <div className="mb-6 flex gap-3">
          <Link
            href={`/viaggi/nuovo?edit=${trip.id}`}
            className="tap-scale flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
          >
            ✏️ Modifica
          </Link>
          <button
            onClick={deleteTrip}
            disabled={deleting}
            className="tap-scale flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-red-200 font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Eliminazione..." : "🗑️ Elimina"}
          </button>
        </div>
      )}

      {user && (
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="tap-scale mb-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-300 font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {exportingPdf ? "Preparazione..." : "📄 Esporta PDF"}
        </button>
      )}

      {user ? (
        <>
          <TripMap
            stops={stops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))}
            className="mb-6 h-80 w-full rounded-3xl"
          />

          <h2 className="mb-3 font-heading text-lg font-bold text-gray-900">📍 Tappe</h2>
          <ol className="mb-6 flex flex-col gap-3">
            {stops.map((stop, i) => (
              <li key={stop.id} className="card-surface flex items-start gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-heading font-bold text-brand-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900">{stop.name}</p>
                  <p className="text-sm text-gray-500">
                    {stop.startDate} → {stop.endDate}
                  </p>
                  {stop.poiRatings && stop.poiRatings.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {[...stop.poiRatings]
                        .sort((a, b) => b.rating - a.rating)
                        .map((poi) => (
                          <li
                            key={poi.name}
                            className="rounded-full bg-lagoon-50 px-2 py-0.5 text-[11px] font-bold text-lagoon-700"
                          >
                            {poi.name} · {poi.rating}/10
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <TripParticipants tripId={trip.id} tripTitle={trip.title} isOwner={isOwner} />

          {isOwner && <p className="mt-6 text-center text-xs text-gray-400">Sei il proprietario di questo viaggio.</p>}
        </>
      ) : (
        <p className="card-surface p-4 text-center text-sm text-brand-700">
          <Link href="/login" className="font-bold underline">
            Accedi
          </Link>{" "}
          per vedere tappe, mappa ed esportare il PDF di questo viaggio.
        </p>
      )}
    </main>
  );
}
