"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { followUser, unfollowUser } from "@/lib/social";
import { useAuth } from "@/lib/auth-context";

export default function FollowButton({ targetUid }: { targetUid: string }) {
  const { user, profile } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.uid === targetUid) return;
    getDoc(doc(getFirebaseDb(), "follows", `${user.uid}_${targetUid}`)).then((snap) =>
      setFollowing(snap.exists())
    );
  }, [user, targetUid]);

  if (!user || user.uid === targetUid) return null;

  async function toggle() {
    if (!user || following === null) return;
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(user.uid, targetUid);
        setFollowing(false);
      } else {
        await followUser(
          user.uid,
          profile?.nickname ?? user.email ?? "Viaggiatore",
          profile?.photoURL ?? user.photoURL ?? null,
          targetUid
        );
        setFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || following === null}
      className={`tap-scale min-h-[44px] rounded-full px-5 text-sm font-bold disabled:opacity-50 ${
        following ? "border-2 border-gray-200 text-gray-700" : "bg-brand-600 text-white shadow-pop"
      }`}
    >
      {following ? "✓ Segui già" : "+ Segui"}
    </button>
  );
}
