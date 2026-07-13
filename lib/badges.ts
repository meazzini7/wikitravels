import type { UserStats } from "./types";

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  isUnlocked: (stats: UserStats) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: "prima-tappa",
    label: "Prima tappa",
    description: "Hai pubblicato il tuo primo viaggio",
    icon: "🧳",
    isUnlocked: (s) => s.tripsCount >= 1,
  },
  {
    id: "esploratore",
    label: "Esploratore",
    description: "5 viaggi pubblicati",
    icon: "🗺️",
    isUnlocked: (s) => s.tripsCount >= 5,
  },
  {
    id: "globetrotter",
    label: "Globetrotter",
    description: "10.000 km percorsi in totale",
    icon: "🌍",
    isUnlocked: (s) => s.totalDistanceKm >= 10000,
  },
  {
    id: "popolare",
    label: "Popolare",
    description: "10 follower",
    icon: "⭐",
    isUnlocked: (s) => s.followersCount >= 10,
  },
  {
    id: "connesso",
    label: "Connesso",
    description: "Segui almeno 5 viaggiatori",
    icon: "🤝",
    isUnlocked: (s) => s.followingCount >= 5,
  },
];

export function unlockedBadges(stats: UserStats): Badge[] {
  return BADGES.filter((b) => b.isUnlocked(stats));
}
