"use client";

interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface ChipToggleProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 5;
}

const COLUMN_CLASSES: Record<NonNullable<ChipToggleProps<string>["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  5: "grid-cols-5",
};

// Selettore a bottoni/chip al posto di una <select>: usato per scelte brevi
// e mutuamente esclusive (tipo viaggio, visibilità, ordinamento...).
export default function ChipToggle<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: ChipToggleProps<T>) {
  return (
    <div className={`grid gap-2 ${COLUMN_CLASSES[columns]}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`tap-scale flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center text-xs font-bold ${
              active
                ? "border-brand-600 bg-brand-50 text-brand-700 shadow-pop"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            {opt.icon && (
              <span className="text-xl" aria-hidden>
                {opt.icon}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
