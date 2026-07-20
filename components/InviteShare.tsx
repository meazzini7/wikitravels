"use client";

import { useState } from "react";

interface InviteShareProps {
  uid: string;
}

export default function InviteShare({ uid }: InviteShareProps) {
  const [copied, setCopied] = useState(false);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wikitravels-seven.vercel.app";
  const inviteUrl = `${siteUrl}/registrati?ref=${uid}`;
  const whatsappText = encodeURIComponent(
    `Vieni a scoprire i miei viaggi su WikiTravels! ${inviteUrl}`
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard non disponibile (es. contesto non sicuro): nessuna azione.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
        <input
          readOnly
          value={inviteUrl}
          className="min-w-0 flex-1 truncate bg-transparent text-sm text-gray-600"
        />
        <button
          onClick={copyLink}
          className="min-h-[44px] shrink-0 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700"
        >
          {copied ? "Copiato ✓" : "Copia"}
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] items-center justify-center rounded-md bg-[#25D366] px-4 font-medium text-white"
      >
        Invita su WhatsApp
      </a>
    </div>
  );
}
