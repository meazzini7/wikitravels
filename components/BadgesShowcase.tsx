"use client";

import { useState } from "react";
import { BADGES, lockedBadges, unlockedBadges, type BadgeContext } from "@/lib/badges";
import Modal from "@/components/ui/Modal";

interface BadgesShowcaseProps {
  ctx: BadgeContext;
}

const LOCKED_PREVIEW_COUNT = 4;

export default function BadgesShowcase({ ctx }: BadgesShowcaseProps) {
  const [showAll, setShowAll] = useState(false);
  const unlocked = unlockedBadges(ctx);
  const locked = lockedBadges(ctx);
  const lockedPreview = locked.slice(0, LOCKED_PREVIEW_COUNT);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold text-gray-700">🏅 Badge</h2>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="tap-scale flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600"
        >
          ℹ️ Vedi tutti ({unlocked.length}/{BADGES.length})
        </button>
      </div>

      {unlocked.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {unlocked.map((b) => (
            <li
              key={b.id}
              title={b.description}
              className="flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1.5 text-sm font-bold text-sun-700"
            >
              <span aria-hidden>{b.icon}</span>
              {b.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Nessun distintivo ancora: pubblica un viaggio per sbloccare il primo!
        </p>
      )}

      {lockedPreview.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-semibold text-gray-400">Prossimi da sbloccare</p>
          <ul className="flex flex-wrap gap-2">
            {lockedPreview.map((b) => (
              <li
                key={b.id}
                title={b.description}
                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-400 grayscale"
              >
                <span aria-hidden>{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={showAll} onClose={() => setShowAll(false)} title={`🏅 Distintivi (${unlocked.length}/${BADGES.length})`}>
        <ul className="flex flex-col gap-1.5">
          {BADGES.map((b) => {
            const isUnlocked = b.isUnlocked(ctx);
            return (
              <li
                key={b.id}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                  isUnlocked ? "bg-sun-50" : "bg-gray-50"
                }`}
              >
                <span className={`text-xl ${isUnlocked ? "" : "grayscale opacity-50"}`} aria-hidden>
                  {b.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${isUnlocked ? "text-sun-700" : "text-gray-500"}`}>
                    {b.label}
                  </p>
                  <p className="truncate text-xs text-gray-400">{b.description}</p>
                </div>
                {isUnlocked && (
                  <span className="shrink-0 text-lg" aria-hidden>
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}
