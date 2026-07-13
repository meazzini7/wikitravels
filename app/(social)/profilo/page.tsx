"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { defaultInterestScores, type InterestScores } from "@/lib/interests";
import { unlockedBadges } from "@/lib/badges";
import InterestSliders from "@/components/InterestSliders";

export default function ProfiloPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [interests, setInterests] = useState<InterestScores>(defaultInterestScores());
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setInterests(profile.interests ?? defaultInterestScores());
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await updateDoc(doc(getFirebaseDb(), "users", user.uid), { interests, bio });
    setSaving(false);
    setSaved(true);
  }

  if (loading || !user || !profile) return null;

  const badges = unlockedBadges(profile.stats);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Il tuo profilo</h1>

      <div className="mb-6 grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.tripsCount}</p>
          <p className="text-xs text-gray-500">Viaggi</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.totalDistanceKm.toFixed(0)}</p>
          <p className="text-xs text-gray-500">km</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.followersCount}</p>
          <p className="text-xs text-gray-500">Follower</p>
        </div>
        <div>
          <p className="text-lg font-bold text-brand-700">{profile.stats.followingCount}</p>
          <p className="text-xs text-gray-500">Seguiti</p>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Badge</h2>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.id}
                title={b.description}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
              >
                <span aria-hidden>{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-gray-700">I tuoi interessi</h2>
      <InterestSliders value={interests} onChange={setInterests} />

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 min-h-[44px] w-full rounded-md bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {saving ? "Salvataggio..." : saved ? "Salvato ✓" : "Salva modifiche"}
      </button>
    </main>
  );
}
