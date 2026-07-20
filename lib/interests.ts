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

export function defaultInterestScores(value = 5): InterestScores {
  return Object.fromEntries(INTEREST_KEYS.map((key) => [key, value])) as InterestScores;
}
