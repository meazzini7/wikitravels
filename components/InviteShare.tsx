"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { generateReferralCode } from "@/lib/id";
import { getSiteUrl } from "@/lib/site-url";

interface InviteShareProps {
  uid: string;
  code: string | null;
}

export default function InviteShare({ uid, code }: InviteShareProps) {
  const [copied, setCopied] = useState(false);
  const [resolvedCode, setResolvedCode] = useState(code);

  // Profili creati prima dell'introduzione del codice breve non ne hanno
  // ancora uno: lo generiamo e salviamo al volo alla prima visita qui,
  // invece di lasciarli per sempre con il link lungo basato sull'uid.
  useEffect(() => {
    if (resolvedCode) return;
    const newCode = generateReferralCode();
    updateDoc(doc(getFirebaseDb(), "users", uid), { referralCode: newCode })
      .then(() => setResolvedCode(newCode))
      .catch((err) => console.error("Impossibile generare il codice invito:", err));
  }, [resolvedCode, uid]);

  const inviteUrl = `${getSiteUrl()}/registrati?ref=${resolvedCode ?? uid}`;
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
