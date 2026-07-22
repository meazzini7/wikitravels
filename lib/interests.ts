export const INTEREST_KEYS = [
  "avventura",
  "cultura",
  "religione",
  "divertimento",
  "natura",
  "sport",
] as const;

export type InterestKey = (typeof INTEREST_KEYS)[number];
export type InterestScores = Record<InterestKey, number>;

export const INTEREST_LABELS: Record<InterestKey, string> = {
  avventura: "Avventura",
  cultura: "Cultura",
  religione: "Spiritualità",
  divertimento: "Divertimento",
  natura: "Natura",
  sport: "Sport",
};

export const INTEREST_SCORE_MIN = 0;
export const INTEREST_SCORE_MAX = 10;

export const INTEREST_ICONS: Record<InterestKey, string> = {
  avventura: "🧗",
  cultura: "🏛️",
  religione: "🙏",
  divertimento: "🎉",
  natura: "🌿",
  sport: "⚽",
};

export function defaultInterestScores(value = 5): InterestScores {
  return Object.fromEntries(INTEREST_KEYS.map((key) => [key, value])) as InterestScores;
}

// Le chiavi con il punteggio più alto: usate per taggare un articolo (es.
// "🧗 Avventura", "🌿 Natura") o per capire a chi consigliarlo.
export function topInterests(scores: InterestScores, count = 2): InterestKey[] {
  return [...INTEREST_KEYS].sort((a, b) => scores[b] - scores[a]).slice(0, count);
}
