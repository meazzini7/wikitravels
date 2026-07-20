export const TRIP_TYPES = ["solo", "coppia", "amici", "famiglia", "gruppo"] as const;

export type TripType = (typeof TRIP_TYPES)[number];

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  solo: "Da solo/a",
  coppia: "In coppia",
  amici: "Con amici",
  famiglia: "In famiglia",
  gruppo: "In gruppo",
};
