"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, limit, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/i18n-context";
import LanguageSwitcher from "./LanguageSwitcher";
import FlamingoMascot from "./FlamingoMascot";

export default function Navbar() {
  const { user, profile, loading } = useAuth();
  const t = useTranslations("nav");
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }
    try {
      const q = query(
        collection(getFirebaseDb(), "users", user.uid, "notifications"),
        where("read", "==", false),
        limit(1)
      );
      return onSnapshot(
        q,
        (snap) => setHasUnread(!snap.empty),
        () => setHasUnread(false)
      );
    } catch {
      setHasUnread(false);
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-brand-100/70 bg-white/85 px-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2">
        <FlamingoMascot className="h-9 w-9" />
        <span className="font-heading text-xl font-extrabold text-gradient-brand">WikiTravels</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/enciclopedia"
          className="hidden min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 sm:flex"
        >
          {t("encyclopedia")}
        </Link>
        {loading ? null : user ? (
          <>
            <Link
              href="/feed"
              className="hidden min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 sm:flex"
            >
              {t("feed")}
            </Link>
            <Link
              href="/viaggi"
              className="hidden min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 sm:flex"
            >
              {t("trips")}
            </Link>
            <Link
              href="/classifica"
              className="hidden min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 sm:flex"
            >
              {t("leaderboard")}
            </Link>
            <Link
              href="/chat"
              className="hidden min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700 sm:flex"
            >
              {t("chat")}
            </Link>
            <Link
              href="/notifiche"
              className="relative flex min-h-[44px] items-center rounded-full px-3 text-gray-600 hover:bg-brand-50 hover:text-brand-700"
              aria-label={t("notifications")}
            >
              🔔
              {hasUnread && (
                <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-brand-600" aria-hidden />
              )}
            </Link>
            <Link
              href="/profilo"
              className="hidden items-center gap-1.5 rounded-full py-1 pl-1 pr-3 font-semibold text-gray-700 hover:bg-brand-50 sm:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm">
                {(profile?.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
              </span>
              {profile?.displayName ?? user.email}
            </Link>
            <LanguageSwitcher />
            <button
              onClick={() => signOut(getFirebaseAuth())}
              className="flex min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-500 hover:bg-gray-100"
            >
              {t("logout")}
            </button>
          </>
        ) : (
          <>
            <LanguageSwitcher />
            <Link
              href="/login"
              className="flex min-h-[44px] items-center rounded-full px-3 font-semibold text-gray-600 hover:bg-brand-50 hover:text-brand-700"
            >
              {t("login")}
            </Link>
            <Link
              href="/registrati"
              className="tap-scale flex min-h-[44px] items-center rounded-full bg-brand-600 px-4 font-bold text-white shadow-pop hover:bg-brand-700"
            >
              {t("register")}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
