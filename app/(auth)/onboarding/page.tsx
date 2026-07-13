"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import InterestSliders from "@/components/InterestSliders";

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
    <div className="w-full max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Raccontaci i tuoi interessi</h1>
      <p className="mb-6 text-sm text-gray-600">
        Ci aiuta a suggerirti viaggi, articoli e persone in linea con i tuoi gusti.
      </p>
      <InterestSliders value={interests} onChange={setInterests} />
      <div className="mt-6">
        <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
          Bio (opzionale)
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Racconta qualcosa di te agli altri viaggiatori..."
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={saving}
        className="mt-6 min-h-[44px] w-full rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Salvataggio..." : "Completa il profilo"}
      </button>
    </div>
  );
}
