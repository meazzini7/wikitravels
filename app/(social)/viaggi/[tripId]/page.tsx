import type { Metadata } from "next";
import { cache } from "react";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSiteUrl } from "@/lib/site-url";
import { TRIP_TYPE_LABELS } from "@/lib/trip-types";
import type { Trip } from "@/lib/types";
import TripDetailClient from "./TripDetailClient";

// I contenuti live (partecipanti, chat, aggiornamenti) li gestisce
// TripDetailClient via Firebase client SDK: questa parte server-side serve
// solo per SEO/metadata/JSON-LD, quindi qualche minuto di cache non si nota
// e risparmia una lettura Firestore + un render completo ad ogni visita.
export const revalidate = 300;

// I viaggi pubblici sono contenuto generato dagli utenti perfetto per la
// ricerca organica (itinerari reali, destinazioni specifiche): prima
// questa pagina era interamente client-side ("use client"), quindi non
// poteva esportare generateMetadata (l'API Metadata di Next.js richiede un
// Server Component) e ogni viaggio mostrava su Google/social solo il
// titolo/descrizione generici del sito invece dei propri.
//
// Avvolta in React.cache(): sia generateMetadata sia il componente pagina
// la chiamano nella stessa richiesta, senza questo farebbero 2 letture
// Firestore identiche invece di una sola condivisa.
const getPublicTrip = cache(async (tripId: string): Promise<Trip | null> => {
  try {
    const snap = await getAdminDb().collection("trips").doc(tripId).get();
    if (!snap.exists) return null;
    const trip = snap.data() as Trip;
    if (trip.visibility !== "public" || trip.status !== "published") return null;
    return trip;
  } catch (err) {
    console.error("Impossibile leggere il viaggio per i metadata:", err);
    return null;
  }
});

export async function generateMetadata({ params }: { params: { tripId: string } }): Promise<Metadata> {
  const trip = await getPublicTrip(params.tripId);
  if (!trip) return {};

  const title = trip.title;
  const description = `Scopri "${trip.title}": un viaggio ${TRIP_TYPE_LABELS[trip.tripType]?.toLowerCase() ?? ""} di ${trip.totalDistanceKm.toFixed(0)} km condiviso dalla community di WikiTravels. Tappe, punti di interesse e budget indicativo.`;

  return {
    title,
    description,
    alternates: { canonical: `/viaggi/${trip.id}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: trip.coverImageUrl ? [trip.coverImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: trip.coverImageUrl ? [trip.coverImageUrl] : undefined,
    },
  };
}

export default async function TripDetailPage({ params }: { params: { tripId: string } }) {
  const trip = await getPublicTrip(params.tripId);
  const siteUrl = getSiteUrl();

  return (
    <>
      {trip && (
        // eslint-disable-next-line react/no-danger
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TouristTrip",
              name: trip.title,
              description: `Viaggio ${TRIP_TYPE_LABELS[trip.tripType] ?? ""} di ${trip.totalDistanceKm.toFixed(0)} km.`,
              image: trip.coverImageUrl ?? undefined,
              url: `${siteUrl}/viaggi/${trip.id}`,
            }),
          }}
        />
      )}
      <TripDetailClient />
    </>
  );
}
