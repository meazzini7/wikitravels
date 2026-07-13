export const INTEREST_KEYS = [
  "avventura",
  "natura",
  "divertimento",
  "lusso",
  "storia",
  "shopping",
  "religione",
] as const;

export type InterestKey = (typeof INTEREST_KEYS)[number];
export type InterestScores = Record<InterestKey, number>;

export const INTEREST_LABELS: Record<InterestKey, string> = {
  avventura: "Avventura",
  natura: "Natura",
  divertimento: "Divertimento",
  lusso: "Lusso",
  storia: "Storia e cultura",
  shopping: "Shopping",
  religione: "Spiritualità",
};

export function defaultInterestScores(value = 5): InterestScores {
  return Object.fromEntries(INTEREST_KEYS.map((key) => [key, value])) as InterestScores;
}
