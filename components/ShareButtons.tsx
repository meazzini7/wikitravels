"use client";

import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard non disponibile: nessuna azione.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-scale flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white"
      >
        💬 WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-scale flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#1877F2] px-4 text-sm font-bold text-white"
      >
        📘 Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-scale flex min-h-[40px] items-center gap-1.5 rounded-full bg-gray-900 px-4 text-sm font-bold text-white"
      >
        ✕ X
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="tap-scale flex min-h-[40px] items-center gap-1.5 rounded-full border-2 border-gray-200 px-4 text-sm font-bold text-gray-700"
      >
        {copied ? "Copiato ✓" : "🔗 Copia link"}
      </button>
    </div>
  );
}
