"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface FloatingPanelProps {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  children: ReactNode;
  className?: string;
}

// Molte card del portale usano "backdrop-blur" (glassmorphism), e
// backdrop-filter crea una propria stacking context CSS: un menu a
// tendina con z-index alto dentro una card può comunque finire coperto
// dalla card SUCCESSIVA nella pagina (che ha la sua stessa proprietà),
// perché lo z-index locale non "esce" dalla stacking context della card
// che lo contiene. La soluzione robusta è un portale: il pannello viene
// renderizzato come figlio diretto di <body>, fuori da qualunque card,
// posizionato via coordinate assolute calcolate dall'elemento ancorato.
export default function FloatingPanel({ anchorRef, open, children, className }: FloatingPanelProps) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  if (!open || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ position: "absolute", top: rect.top, left: rect.left, width: rect.width }}
      className={`z-[9999] ${className ?? ""}`}
    >
      {children}
    </div>,
    document.body
  );
}
