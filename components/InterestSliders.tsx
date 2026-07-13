"use client";

import { INTEREST_KEYS, INTEREST_LABELS, type InterestScores } from "@/lib/interests";

interface InterestSlidersProps {
  value: InterestScores;
  onChange: (value: InterestScores) => void;
}

export default function InterestSliders({ value, onChange }: InterestSlidersProps) {
  return (
    <div className="flex flex-col gap-5">
      {INTEREST_KEYS.map((key) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <label htmlFor={`interest-${key}`} className="font-medium text-gray-700">
              {INTEREST_LABELS[key]}
            </label>
            <span className="text-gray-500">{value[key]}</span>
          </div>
          <input
            id={`interest-${key}`}
            type="range"
            min={1}
            max={10}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
            className="h-11 w-full accent-brand-600"
          />
        </div>
      ))}
    </div>
  );
}
