"use client";

import {
  INTEREST_ICONS,
  INTEREST_KEYS,
  INTEREST_LABELS,
  INTEREST_SCORE_MAX,
  INTEREST_SCORE_MIN,
  type InterestScores,
} from "@/lib/interests";

interface InterestSlidersProps {
  value: InterestScores;
  onChange: (value: InterestScores) => void;
}

// Selettore "a bottoni" (stepper -/+) al posto di un cursore trascinabile:
// più semplice da usare su mobile e più coerente con lo stile a bottoni del
// resto del portale.
export default function InterestSliders({ value, onChange }: InterestSlidersProps) {
  function step(key: keyof InterestScores, delta: number) {
    const next = Math.min(INTEREST_SCORE_MAX, Math.max(INTEREST_SCORE_MIN, value[key] + delta));
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {INTEREST_KEYS.map((key) => (
        <div key={key} className="card-surface flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <span className="text-2xl" aria-hidden>
            {INTEREST_ICONS[key]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold text-gray-900">{INTEREST_LABELS[key]}</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
                style={{ width: `${(value[key] / INTEREST_SCORE_MAX) * 100}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => step(key, -1)}
            disabled={value[key] <= INTEREST_SCORE_MIN}
            aria-label={`Diminuisci ${INTEREST_LABELS[key]}`}
            className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-500 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-5 shrink-0 text-center font-heading text-base font-extrabold text-brand-700">
            {value[key]}
          </span>
          <button
            type="button"
            onClick={() => step(key, 1)}
            disabled={value[key] >= INTEREST_SCORE_MAX}
            aria-label={`Aumenta ${INTEREST_LABELS[key]}`}
            className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white disabled:opacity-30"
          >
            +
          </button>
        </div>
      ))}
    </div>
  );
}
