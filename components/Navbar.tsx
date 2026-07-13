"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import FlamingoMascot from "./FlamingoMascot";

export default function Navbar() {
  const { user, profile, loading } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-100 bg-white/90 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
        <FlamingoMascot className="h-8 w-8" />
        WikiTravels
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {loading ? null : user ? (
          <>
            <Link
              href="/viaggi"
              className="flex min-h-[44px] items-center px-3 text-gray-600 hover:text-brand-700"
            >
              Viaggi
            </Link>
            <span className="hidden text-gray-600 sm:inline">
              {profile?.displayName ?? user.email}
            </span>
            <button
              onClick={() => signOut(getFirebaseAuth())}
              className="flex min-h-[44px] items-center px-3 text-gray-600 hover:text-brand-700"
            >
              Esci
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="flex min-h-[44px] items-center px-3 text-gray-600 hover:text-brand-700"
            >
              Accedi
            </Link>
            <Link
              href="/registrati"
              className="flex min-h-[44px] items-center rounded-md bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
            >
              Registrati
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
