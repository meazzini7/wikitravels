import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "./firebase-client";
import { defaultInterestScores } from "./interests";
import type { UserProfile } from "./types";

// Chiamata dopo login/registrazione: crea il documento users/{uid} se è la
// prima volta che l'utente si autentica (es. primo accesso con Google).
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Viaggiatore",
    email: user.email ?? "",
    photoURL: user.photoURL,
    bio: "",
    interests: defaultInterestScores(),
    onboardingCompleted: false,
    createdAt: Date.now(),
    stats: { tripsCount: 0, totalDistanceKm: 0, followersCount: 0, followingCount: 0 },
    homeLocation: null,
  };
  await setDoc(ref, profile);
  return profile;
}
