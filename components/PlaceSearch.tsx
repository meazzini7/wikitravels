"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { searchPlaces, type GeocodeResult } from "@/lib/geocoding";
import FloatingPanel from "@/components/ui/FloatingPanel";

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
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  function selectResult(r: GeocodeResult) {
    onSelect(r);
    setText(r.label);
    setOpen(false);
    setResults([]);
    setError(null);
  }

  // Prima il "Aggiungi" funzionava solo cliccando un suggerimento del
  // dropdown: chi scriveva un luogo e premeva Invio (o cliccava altrove
  // prima che arrivasse la risposta di Nominatim) non vedeva succedere
  // nulla, e restava bloccato con il bottone "Avanti" disabilitato senza
  // nessun messaggio. Ora Invio seleziona il primo risultato già trovato,
  // oppure lancia subito una ricerca (senza aspettare il debounce) e
  // mostra un errore chiaro se non trova nulla.
  async function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (results.length > 0) {
      selectResult(results[0]);
      return;
    }
    const q = text.trim();
    if (q.length < 3) {
      setError("Scrivi almeno 3 caratteri per cercare un luogo.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const found = await searchPlaces(q);
      if (found.length > 0) {
        selectResult(found[0]);
      } else {
        setError(`Nessun luogo trovato per "${q}". Prova con un nome diverso, ad esempio solo la città.`);
      }
    } catch {
      setError("Ricerca non riuscita, riprova tra poco.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Cerca una città o un luogo..."}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      />
      {searching && <p className="mt-1 text-xs text-gray-400">Ricerca in corso...</p>}
      {!searching && error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <FloatingPanel anchorRef={wrapperRef} open={open && results.length > 0}>
        <ul className="mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onClick={() => selectResult(r)}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-50"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      </FloatingPanel>
    </div>
  );
}
