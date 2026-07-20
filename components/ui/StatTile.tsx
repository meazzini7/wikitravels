interface StatTileProps {
  icon: string;
  value: string | number;
  label: string;
  tone?: "brand" | "lagoon" | "sun";
}

const TONE_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  brand: "bg-brand-50 text-brand-700",
  lagoon: "bg-lagoon-50 text-lagoon-700",
  sun: "bg-sun-50 text-sun-700",
};

export default function StatTile({ icon, value, label, tone = "brand" }: StatTileProps) {
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-3 text-center ${TONE_CLASSES[tone]}`}>
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <p className="font-heading text-lg font-bold leading-none">{value}</p>
      <p className="text-[11px] font-semibold opacity-80">{label}</p>
    </div>
  );
}
