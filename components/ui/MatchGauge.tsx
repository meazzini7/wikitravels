interface MatchGaugeProps {
  percent: number;
  size?: number;
}

// Anello di affinità (0-100%) usato nel feed al posto di una semplice
// etichetta testuale, per rendere il match score un elemento visivo/di gioco.
export default function MatchGauge({ percent, size = 44 }: MatchGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 75 ? "#dd2166" : clamped >= 45 ? "#f7a70a" : "#28a19d";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="white" fillOpacity={0.9} stroke="#f3f4f6" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>
        {clamped}%
      </span>
    </div>
  );
}
