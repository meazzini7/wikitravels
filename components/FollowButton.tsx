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
          profile?.displayName ?? user.email ?? "Viaggiatore",
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
      className={`min-h-[44px] rounded-md px-4 text-sm font-medium disabled:opacity-50 ${
        following ? "border border-gray-300 text-gray-700" : "bg-brand-600 text-white"
      }`}
    >
      {following ? "Segui già" : "Segui"}
    </button>
  );
}
