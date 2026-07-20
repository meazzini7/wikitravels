import type { InterestScores } from "./interests";
import type { TripType } from "./trip-types";

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

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  bio: string;
  interests: InterestScores;
  onboardingCompleted: boolean;
  createdAt: number;
  stats: UserStats;
  homeLocation: HomeLocation | null;
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
}

export interface Trip {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
  authorInterests: InterestScores;
  title: string;
  description: string;
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
  type: "follow" | "trip";
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  tripId: string | null;
  tripTitle: string | null;
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
}
