import type { InterestScores } from "./interests";
import type { TripType } from "./trip-types";
import type { Locale } from "./i18n/config";

export interface UserStats {
  tripsCount: number;
  totalDistanceKm: number;
  followersCount: number;
  followingCount: number;
}

export interface HomeLocation {
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
}

export interface DreamDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  // Handle pubblico e univoco: mostrato ovunque al posto di nome e
  // cognome, finché non ci si segue a vicenda (vedi lib/social.ts,
  // checkMutualFollow) o non è il proprio profilo.
  nickname: string;
  nicknameLower: string;
  email: string;
  photoURL: string | null;
  bio: string;
  interests: InterestScores;
  onboardingCompleted: boolean;
  createdAt: number;
  stats: UserStats;
  homeLocation: HomeLocation | null;
  dreamDestinations: DreamDestination[];
  // Chiavi in minuscolo (nome città + codice paese) derivate da
  // dreamDestinations: permettono una query Firestore "array-contains-any"
  // per trovare chi sogna una certa meta, senza dover confrontare oggetti.
  dreamDestinationKeys: string[];
  // Codice breve (6 caratteri) per il link di invito, molto più corto
  // dell'uid completo di Firebase Auth.
  referralCode: string;
  // Id dei viaggi altrui a cui si partecipa (invito accettato): servono
  // per includerli nelle statistiche (km, città, nazioni) e nei
  // distintivi di chi partecipa, non solo di chi li ha creati.
  participantTripIds: string[];
}

export interface PoiRating {
  name: string;
  rating: number;
}

export interface TripStop {
  id: string;
  authorId: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  order: number;
  startDate: string;
  endDate: string;
  // Punti di interesse suggeriti per questo luogo (via AI, in cache per
  // nome luogo) votati 0-10 da chi crea il viaggio, al posto di una
  // descrizione libera.
  poiRatings?: PoiRating[];
}

export interface TripParticipant {
  uid: string;
  nickname: string;
  photoURL: string | null;
  status: "invited" | "accepted";
  invitedBy: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  authorInterests: InterestScores;
  // Interessi specifici DI QUESTO VIAGGIO (non solo quelli generali
  // dell'autore): un viaggiatore può fare sia un giro culturale rilassato
  // che un'avventura estrema, e i due viaggi non devono avere lo stesso
  // punteggio solo perché hanno lo stesso autore.
  scores: InterestScores;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  totalDistanceKm: number;
  visibility: "public" | "private";
  tripType: TripType;
  costEuro: number;
  countryCodes: string[];
  homeDistanceKm: number | null;
  homeTravelHours: number | null;
  status: "draft" | "published";
  createdAt: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  type: "follow" | "trip" | "dream_trip" | "dream_article" | "trip_invite";
  fromUid: string | null;
  fromDisplayName: string | null;
  fromPhotoURL: string | null;
  tripId: string | null;
  tripTitle: string | null;
  articleSlug: string | null;
  articleTitle: string | null;
  destinationName: string | null;
  createdAt: number;
  read: boolean;
}

export interface ChatSummary {
  id: string;
  participants: [string, string];
  lastMessage: string;
  lastMessageAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface ArticleTranslation {
  title: string;
  contentHtml: string;
  metaTitle: string;
  metaDescription: string;
}

export interface Article {
  title: string;
  slug: string;
  destination: string;
  vibe: string;
  contentHtml: string;
  coverImageUrl: string | null;
  coverImageCredit: { author: string; link: string } | null;
  scores: InterestScores;
  tier: 1 | 2 | 3;
  seo: { metaTitle: string; metaDescription: string };
  status: "published" | "draft";
  views: number;
  createdAt: unknown;
  // Traduzioni generate al volo (on-demand) la prima volta che qualcuno
  // apre l'articolo in quella lingua, e da quel momento riusate da
  // Firestore invece di richiamare Gemini a ogni visita. Chiave = codice
  // lingua (es. "en"), assente per l'italiano (che è il contenuto principale).
  translations?: Partial<Record<Locale, ArticleTranslation>>;
}
