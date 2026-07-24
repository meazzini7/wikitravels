import type { UserStats } from "./types";
import type { VisitedWorldStats } from "./world-stats";
import { INTEREST_KEYS, INTEREST_LABELS, type InterestScores } from "./interests";

export interface BadgeContext {
  stats: UserStats;
  worldStats: VisitedWorldStats;
  dreamDestinationsCount: number;
  interests: InterestScores;
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  isUnlocked: (ctx: BadgeContext) => boolean;
}

function tripsBadge(id: string, count: number, label: string, icon: string): Badge {
  return {
    id,
    label,
    description: `${count} viagg${count === 1 ? "io pubblicato" : "i pubblicati"}`,
    icon,
    isUnlocked: (ctx) => ctx.stats.tripsCount >= count,
  };
}

function kmBadge(id: string, km: number, label: string, icon: string, note?: string): Badge {
  return {
    id,
    label,
    description: `${km.toLocaleString("it-IT")} km percorsi in totale${note ? ` (${note})` : ""}`,
    icon,
    isUnlocked: (ctx) => ctx.stats.totalDistanceKm >= km,
  };
}

function countriesBadge(id: string, count: number, label: string, icon: string): Badge {
  return {
    id,
    label,
    description: `${count} nazion${count === 1 ? "e visitata" : "i visitate"}`,
    icon,
    isUnlocked: (ctx) => ctx.worldStats.countriesCount >= count,
  };
}

function citiesBadge(id: string, count: number, label: string, icon: string): Badge {
  return {
    id,
    label,
    description: `${count} citt${count === 1 ? "à visitata" : "à visitate"}`,
    icon,
    isUnlocked: (ctx) => ctx.worldStats.citiesCount >= count,
  };
}

function followersBadge(id: string, count: number, label: string, icon: string): Badge {
  return {
    id,
    label,
    description: `${count} follower`,
    icon,
    isUnlocked: (ctx) => ctx.stats.followersCount >= count,
  };
}

function followingBadge(id: string, count: number, label: string, icon: string): Badge {
  return {
    id,
    label,
    description: `Segui ${count} viaggiatori`,
    icon,
    isUnlocked: (ctx) => ctx.stats.followingCount >= count,
  };
}

function dreamBadge(id: string, count: number, label: string, icon: string): Badge {
  return {
    id,
    label,
    description: `${count} met${count === 1 ? "a dei sogni salvata" : "e dei sogni salvate"}`,
    icon,
    isUnlocked: (ctx) => ctx.dreamDestinationsCount >= count,
  };
}

export const BADGES: Badge[] = [
  // Viaggi pubblicati
  tripsBadge("trip-1", 1, "Prima tappa", "🧳"),
  tripsBadge("trip-3", 3, "Viaggiatore abituale", "🎒"),
  tripsBadge("trip-5", 5, "Esploratore", "🗺️"),
  tripsBadge("trip-10", 10, "Instancabile", "✈️"),
  tripsBadge("trip-15", 15, "Nomade", "🧭"),
  tripsBadge("trip-20", 20, "Globetrotter", "🌍"),
  tripsBadge("trip-30", 30, "Viaggiatore leggendario", "👑"),
  tripsBadge("trip-50", 50, "Mito del viaggio", "🏆"),

  // Chilometri percorsi
  kmBadge("km-500", 500, "Prime rotte", "🚗"),
  kmBadge("km-1000", 1000, "In marcia", "🛣️"),
  kmBadge("km-2500", 2500, "Su di giri", "⛽"),
  kmBadge("km-5000", 5000, "Lunga percorrenza", "🚀"),
  kmBadge("km-10000", 10000, "Globetrotter dei km", "🌐"),
  kmBadge("km-25000", 25000, "Giro del mondo", "🌍", "più del giro della Terra all'equatore"),
  kmBadge("km-50000", 50000, "Instancabile viaggiatore", "🛰️"),

  // Nazioni visitate
  countriesBadge("country-1", 1, "Prima frontiera", "🛂"),
  countriesBadge("country-2", 2, "Doppia meta", "🌐"),
  countriesBadge("country-3", 3, "Multiculturale", "🏳️"),
  countriesBadge("country-5", 5, "Collezionista di confini", "📔"),
  countriesBadge("country-10", 10, "Esploratore del mondo", "🗺️"),
  countriesBadge("country-15", 15, "Giramondo", "✈️"),
  countriesBadge("country-20", 20, "Ambasciatore del pianeta", "🌍"),
  countriesBadge("country-30", 30, "Leggenda vivente", "👑"),

  // Città visitate
  citiesBadge("city-1", 1, "Prima città", "🏙️"),
  citiesBadge("city-3", 3, "Turista curioso", "🏘️"),
  citiesBadge("city-5", 5, "Esploratore urbano", "🏛️"),
  citiesBadge("city-10", 10, "Collezionista di città", "🌆"),
  citiesBadge("city-20", 20, "Metropolitano", "🌃"),
  citiesBadge("city-35", 35, "Cartografo", "🗺️"),
  citiesBadge("city-50", 50, "Conoscitore del mondo", "🌉"),

  // Follower
  followersBadge("followers-1", 1, "Primo fan", "⭐"),
  followersBadge("followers-5", 5, "Piccola community", "🌟"),
  followersBadge("followers-10", 10, "Popolare", "🎉"),
  followersBadge("followers-25", 25, "Influente", "📣"),
  followersBadge("followers-50", 50, "Punto di riferimento", "🏅"),
  followersBadge("followers-100", 100, "Celebrità di WikiTravels", "🏆"),

  // Seguiti
  followingBadge("following-3", 3, "Curioso", "👀"),
  followingBadge("following-5", 5, "Connesso", "🤝"),
  followingBadge("following-10", 10, "Ben informato", "📡"),
  followingBadge("following-25", 25, "Super connesso", "🔗"),
  followingBadge("following-50", 50, "Networker", "🕸️"),

  // Mete dei sogni
  dreamBadge("dream-1", 1, "Un sogno nel cassetto", "✨"),
  dreamBadge("dream-5", 5, "Wishlist infinita", "🌠"),
  dreamBadge("dream-10", 10, "Sognatore instancabile", "💫"),

  // Interessi al massimo (uno per categoria)
  ...INTEREST_KEYS.map(
    (key): Badge => ({
      id: `interest-${key}-max`,
      label: `${INTEREST_LABELS[key]}: al massimo`,
      description: `Hai portato "${INTEREST_LABELS[key]}" a 10/10 nei tuoi interessi`,
      icon:
        { avventura: "🧗", cultura: "🏛️", religione: "🙏", divertimento: "🎉", natura: "🌿", sport: "⚽" }[key] ?? "💛",
      isUnlocked: (ctx) => ctx.interests[key] >= 10,
    })
  ),
];

export function unlockedBadges(ctx: BadgeContext): Badge[] {
  return BADGES.filter((b) => b.isUnlocked(ctx));
}

export function lockedBadges(ctx: BadgeContext): Badge[] {
  return BADGES.filter((b) => !b.isUnlocked(ctx));
}
