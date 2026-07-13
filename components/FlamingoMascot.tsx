interface FlamingoMascotProps {
  className?: string;
}

// Mascotte del brand: fenicottero cartoon stilizzato, usato nel logo e come
// base per la favicon (vedi app/icon.svg).
export default function FlamingoMascot({ className }: FlamingoMascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Mascotte WikiTravels: un fenicottero"
    >
      {/* zampa d'appoggio */}
      <path
        d="M108 158 L101 196"
        stroke="#ba1553"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* zampa piegata */}
      <path
        d="M128 156 L138 176 L126 196"
        stroke="#ba1553"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* corpo */}
      <ellipse cx="118" cy="128" rx="42" ry="34" fill="#fb6a9c" />
      {/* piuma / ombreggiatura ala */}
      <path
        d="M92 108 Q120 126 100 158 Q76 132 92 108 Z"
        fill="#dd2166"
        opacity="0.55"
      />
      {/* collo a S */}
      <path
        d="M96 108 C 66 96, 58 62, 76 42"
        stroke="#fb6a9c"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      {/* testa */}
      <circle cx="70" cy="38" r="18" fill="#fb6a9c" />
      {/* becco */}
      <path
        d="M85 40 Q 112 44 118 56 Q 98 62 82 50 Z"
        fill="#3a2a26"
      />
      <path d="M84 47 Q 100 51 111 55" stroke="#1f1512" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* occhio */}
      <circle cx="74" cy="33" r="3" fill="#1f1512" />
    </svg>
  );
}
