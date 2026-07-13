"use client";

import { useAuth } from "@/lib/auth-context";
import FlamingoMascot from "@/components/FlamingoMascot";

export default function HomePage() {
  const { user, profile, loading } = useAuth();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <FlamingoMascot className="h-24 w-24" />
      <h1 className="text-3xl font-bold text-brand-700 sm:text-4xl">
        WikiTravels
      </h1>
      {!loading && user ? (
        <p className="text-base text-gray-600">
          Bentornato, {profile?.displayName ?? user.email}! Viaggi, social ed
          enciclopedia arrivano nei prossimi step.
        </p>
      ) : (
        <p className="text-base text-gray-600">
          Il portale social per viaggiatori. Registrati per iniziare a
          organizzare i tuoi viaggi.
        </p>
      )}
    </main>
  );
}
