import type { InterestScores } from "./interests";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  bio: string;
  interests: InterestScores;
  onboardingCompleted: boolean;
  createdAt: number;
}

export interface TripStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  startDate: string;
  endDate: string;
}

export interface Trip {
  id: string;
  authorId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  totalDistanceKm: number;
  status: "draft" | "published";
  createdAt: number;
  updatedAt: number;
}
