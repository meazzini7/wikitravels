"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface FloatingPanelProps {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  children: ReactNode;
  className?: string;
}

const MARGIN = 12;
const MIN_PANEL_HEIGHT = 160;

// Molte card del portale usano "backdrop-blur" (glassmorphism), e
// backdrop-filter crea una propria stacking context CSS: un menu a
// tendina con z-index alto dentro una card può comunque finire coperto
// dalla card SUCCESSIVA nella pagina (che ha la sua stessa proprietà),
// perché lo z-index locale non "esce" dalla stacking context della card
// che lo contiene. La soluzione robusta è un portale: il pannello viene
// renderizzato come figlio diretto di <body>, fuori da qualunque card,
// posizionato via coordinate assolute calcolate dall'elemento ancorato.
export default function FloatingPanel({ anchorRef, open, children, className }: FloatingPanelProps) {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const spaceBelow = viewportHeight - r.bottom - MARGIN;
      const spaceAbove = r.top - MARGIN;
      // Se sotto l'input non c'è abbastanza spazio (tipico con la
      // tastiera del telefono aperta, che riduce il visual viewport) ma
      // sopra ce n'è di più, il pannello si apre verso l'alto invece di
      // restare schiacciato o uscire dallo schermo.
      const openUpward = spaceBelow < MIN_PANEL_HEIGHT && spaceAbove > spaceBelow;
      setPos({
        top: openUpward ? r.top + window.scrollY : r.bottom + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        maxHeight: Math.max(120, (openUpward ? spaceAbove : spaceBelow)),
        openUpward,
      });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    // window.resize spesso NON scatta quando si apre la tastiera virtuale
    // su mobile (il layout viewport resta invariato): senza ascoltare
    // anche il visual viewport, la posizione calcolata restava quella di
    // prima che la tastiera comparisse, facendo "aprire male" la tendina.
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "absolute",
        // Aprendo verso l'alto si riserva tutto lo spazio disponibile
        // (dal bordo dello schermo fino all'ancora) e il contenuto viene
        // allineato in basso (vedi justifyContent sotto): così, qualunque
        // sia l'altezza reale del contenuto, il suo bordo inferiore tocca
        // sempre l'ancora invece di lasciare un vuoto in mezzo.
        top: pos.openUpward ? pos.top - pos.maxHeight : pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: pos.openUpward ? "flex-end" : "flex-start",
      }}
      className={`z-[9999] ${className ?? ""}`}
    >
      {children}
    </div>,
    document.body
  );
}
