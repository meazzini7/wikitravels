"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase-client";
import { ensureUserProfile } from "./ensure-user-profile";
import { generateUniqueNickname } from "./nickname";
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
    return onSnapshot(
      doc(getFirebaseDb(), "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setLoading(false);
          // Profili creati prima dell'introduzione del nickname (nome e
          // cognome mostrati ovunque fuori dal proprio profilo, ma il resto
          // del portale ora mostra solo il nickname): lo genera e lo
          // salva una volta sola, così anche i vecchi account lo ottengono
          // senza dover riaccedere da zero.
          if (!data.nickname) {
            generateUniqueNickname(data.displayName).then((nickname) => {
              updateDoc(doc(getFirebaseDb(), "users", user.uid), {
                nickname,
                nicknameLower: nickname.toLowerCase(),
              }).catch((err) => console.error("Impossibile assegnare il nickname:", err));
            });
          }
          return;
        }
        // Il documento del profilo non esiste (es. creazione fallita al
        // primo accesso, o una sessione rimasta salvata da prima che il
        // profilo fosse stato creato): senza questo, il profilo restava
        // bloccato a null per sempre e pagine come /profilo apparivano
        // vuote a tempo indeterminato. Lo ricreiamo qui invece di arrenderci.
        ensureUserProfile(user)
          .then(setProfile)
          .catch((err) => console.error("Impossibile creare il profilo mancante:", err))
          .finally(() => setLoading(false));
      },
      (err) => {
        console.error("Impossibile caricare il profilo:", err);
        setLoading(false);
      }
    );
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
