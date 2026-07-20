"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import InterestSliders from "@/components/InterestSliders";
import FlamingoMascot from "@/components/FlamingoMascot";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [interests, setInterests] = useState<InterestScores>(defaultInterestScores());
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setInterests(profile.interests ?? defaultInterestScores());
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const onSubmit = async () => {
    if (!user) return;
    setSaving(true);
    await updateDoc(doc(getFirebaseDb(), "users", user.uid), {
      interests,
      bio,
      onboardingCompleted: true,
    });
    setSaving(false);
    router.push("/");
  };

  if (loading || !user) return null;

  return (
    <div className="card-surface w-full max-w-lg p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <FlamingoMascot className="h-14 w-14" />
        <h1 className="font-heading text-2xl font-bold text-gray-900">Raccontaci i tuoi interessi</h1>
        <p className="text-sm text-gray-500">
          Tocca − e + per regolare ogni interesse: ci aiuta a suggerirti viaggi, articoli e persone in linea con i
          tuoi gusti.
        </p>
      </div>
      <InterestSliders value={interests} onChange={setInterests} />
      <div className="mt-6">
        <label htmlFor="bio" className="mb-1 block text-sm font-bold text-gray-700">
          Bio (opzionale)
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
          placeholder="Racconta qualcosa di te agli altri viaggiatori..."
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={saving}
        className="tap-scale mt-6 min-h-[48px] w-full rounded-2xl bg-brand-600 px-4 py-2 font-heading font-bold text-white shadow-pop hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Salvataggio..." : "Completa il profilo 🚀"}
      </button>
    </div>
  );
}
