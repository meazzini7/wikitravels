"use client";

import { useRef, useState } from "react";

type Line = { ok: boolean; text: string };
type Reply = { ok: boolean; remaining: number; slug?: string; title?: string; error?: string };

// Concatena le riscritture: ogni chiamata ne fa una sola (circa mezzo minuto).
// Si ferma da sola quando finiscono, dopo 3 errori di fila o se premi Ferma.
export default function RewriteRunner({
  secret,
  initialRemaining,
}: {
  secret: string;
  initialRemaining: number | null;
}) {
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const stopRef = useRef(false);

  async function run() {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    let errorsInARow = 0;
    try {
      while (!stopRef.current) {
        let reply: Reply;
        try {
          const res = await fetch(`/api/admin/rewrite-article?secret=${encodeURIComponent(secret)}`, {
            cache: "no-store",
          });
          reply = (await res.json()) as Reply;
          if (!res.ok && !reply.error) reply = { ok: false, remaining: -1, error: `Errore ${res.status}` };
        } catch {
          reply = { ok: false, remaining: -1, error: "Connessione interrotta o troppo lenta" };
        }

        if (reply.ok && !reply.slug) {
          setRemaining(0);
          setLines((l) => [{ ok: true, text: "Fatto: non ci sono più articoli da rinnovare." }, ...l]);
          break;
        }
        if (reply.remaining >= 0) setRemaining(reply.remaining);
        if (reply.ok) {
          errorsInARow = 0;
          setDone((n) => n + 1);
          setLines((l) => [{ ok: true, text: reply.title ?? reply.slug ?? "Articolo rinnovato" }, ...l]);
        } else {
          errorsInARow += 1;
          setLines((l) => [
            { ok: false, text: `${reply.slug ?? "Errore"}: ${reply.error ?? "non riuscito"}`.slice(0, 220) },
            ...l,
          ]);
          if (errorsInARow >= 3) {
            setLines((l) => [{ ok: false, text: "Mi fermo dopo 3 errori di fila. Riprova più tardi." }, ...l]);
            break;
          }
        }
      }
    } finally {
      setRunning(false);
    }
  }

  const finished = remaining === 0;

  return (
    <div>
      <div className="card-surface mb-4 p-4 text-center">
        <p className="text-4xl font-extrabold text-brand-600">{remaining ?? "?"}</p>
        <p className="text-sm text-gray-600">articoli ancora da rinnovare</p>
        {done > 0 && <p className="mt-1 text-xs text-gray-500">Rinnovati in questa sessione: {done}</p>}
      </div>

      {!finished && (
        <div className="mb-2 flex gap-2">
          {!running ? (
            <button
              type="button"
              onClick={run}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl bg-brand-600 px-4 font-heading font-bold text-white shadow-pop"
            >
              ▶ Avvia il rinnovo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (stopRef.current = true)}
              className="tap-scale min-h-[48px] flex-1 rounded-2xl border border-gray-300 bg-white px-4 font-heading font-bold text-gray-800"
            >
              ⏹ Ferma dopo questo articolo
            </button>
          )}
        </div>
      )}
      {running && (
        <p className="mb-3 text-xs text-gray-500">
          Ogni articolo richiede circa mezzo minuto. Tieni questa pagina aperta: se la chiudi si ferma, ma potrai
          riprendere da dove eri arrivato.
        </p>
      )}
      {finished && <p className="mb-3 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-800">✅ Tutti gli articoli sono stati rinnovati.</p>}

      {lines.length > 0 && (
        <ul className="space-y-1.5">
          {lines.map((line, i) => (
            <li
              key={`${i}-${line.text}`}
              className={`rounded-xl px-3 py-2 text-sm ${line.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800"}`}
            >
              {line.ok ? "✅" : "⚠️"} {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
