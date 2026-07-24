"use client";

import { useState } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <li key={item.question} className="card-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              className="tap-scale flex w-full items-center justify-between gap-3 p-4 text-left"
              aria-expanded={open}
            >
              <span className="font-heading font-bold text-gray-900">{item.question}</span>
              <span className={`shrink-0 text-brand-600 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
                ▾
              </span>
            </button>
            {open && <p className="whitespace-pre-line px-4 pb-4 text-sm text-gray-600">{item.answer}</p>}
          </li>
        );
      })}
    </ul>
  );
}
