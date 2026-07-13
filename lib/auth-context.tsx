"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase-client";
import type { UserProfile } from "./types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
        setUser(firebaseUser);
        if (!firebaseUser) {
          setProfile(null);
          setLoading(false);
        }
      });
    } catch (err) {
      // Config Firebase mancante o non valida (es. env var non ancora
      // impostate in un ambiente preview): degrada a "utente non loggato"
      // invece di far crashare l'intera app.
      console.error("Firebase Auth non disponibile:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(getFirebaseDb(), "users", user.uid), (snap) => {
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      setLoading(false);
    });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
