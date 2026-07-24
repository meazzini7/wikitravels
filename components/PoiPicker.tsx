"use client";

import { useEffect, useState } from "react";
import type { PoiRating } from "@/lib/types";

interface PoiPickerProps {
  placeName: string;
  value: PoiRating[];
  onChange: (ratings: PoiRating[]) => void;
}

// Al posto di una descrizione libera del viaggio: per ogni tappa, l'AI
// suggerisce i punti di interesse più famosi del luogo (funziona per
// qualsiasi posto al mondo, non è un elenco statico) e si vota rapidamente
// da 0 a 10 quanto vale la pena visitarli, con lo stesso stile a bottoni −/+
// già usato per gli interessi.
export default function PoiPicker({ placeName, value, onChange }: PoiPickerProps) {
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSuggestions(null);
    fetch(`/api/poi/suggest?place=${encodeURIComponent(placeName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSuggestions(Array.isArray(data.names) ? data.names : []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [placeName]);

  async function loadMore() {
    if (!suggestions) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/poi/suggest?place=${encodeURIComponent(placeName)}&exclude=${encodeURIComponent(suggestions.join(","))}`
      );
      const data = await res.json();
      const fresh: string[] = Array.isArray(data.names) ? data.names : [];
      setSuggestions((prev) => Array.from(new Set([...(prev ?? []), ...fresh])));
    } catch (err) {
      console.error("Impossibile caricare altri punti di interesse:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function toggle(name: string) {
    const existing = value.find((v) => v.name === name);
    onChange(existing ? value.filter((v) => v.name !== name) : [...value, { name, rating: 8 }]);
  }

  function setRating(name: string, rating: number) {
    onChange(value.map((v) => (v.name === name ? { ...v, rating: Math.min(10, Math.max(0, rating)) } : v)));
  }

  if (suggestions === null) {
    return <p className="text-xs text-gray-400">Cerco i punti di interesse di {placeName}...</p>;
  }
  if (suggestions.length === 0) {
    return <p className="text-xs text-gray-400">Nessun punto di interesse trovato per {placeName}.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-500">Cosa vale la pena vedere? Tocca e vota da 0 a 10:</p>
      {suggestions.map((name) => {
        const rated = value.find((v) => v.name === name);
        return (
          <div key={name} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggle(name)}
              className={`tap-scale flex-1 truncate rounded-full px-3 py-1.5 text-left text-xs font-bold ${
                rated ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {name}
            </button>
            {rated && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRating(name, rated.rating - 1)}
                  aria-label={`Diminuisci voto ${name}`}
                  className="tap-scale flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-bold text-brand-700">{rated.rating}</span>
                <button
                  type="button"
                  onClick={() => setRating(name, rated.rating + 1)}
                  aria-label={`Aumenta voto ${name}`}
                  className="tap-scale flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={loadMore}
        disabled={loadingMore}
        className="tap-scale mt-1 flex items-center justify-center gap-1.5 self-start rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 disabled:opacity-50"
      >
        <span className={loadingMore ? "animate-spin" : ""} aria-hidden>
          🔄
        </span>
        {loadingMore ? "Cerco altri suggerimenti..." : "Altri suggerimenti"}
      </button>
    </div>
  );
}
