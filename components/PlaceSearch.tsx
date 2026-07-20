"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces, type GeocodeResult } from "@/lib/geocoding";

interface PlaceSearchProps {
  placeholder?: string;
  initialValue?: string;
  onSelect: (place: GeocodeResult) => void;
  className?: string;
}

export default function PlaceSearch({ placeholder, initialValue, onSelect, className }: PlaceSearchProps) {
  const [text, setText] = useState(initialValue ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchPlaces(text)
        .then((found) => {
          setResults(found);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [text]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "Cerca una città o un luogo..."}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      />
      {searching && <p className="mt-1 text-xs text-gray-400">Ricerca in corso...</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setText(r.label);
                  setOpen(false);
                  setResults([]);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
