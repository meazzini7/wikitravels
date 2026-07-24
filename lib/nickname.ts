"use client";

import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getFirebaseDb } from "./firebase-client";

function slugifyBase(displayName: string): string {
  return (
    displayName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 14) || "viaggiatore"
  );
}

// true se qualcun ALTRO (uid diverso da excludeUid) ha già questo nickname.
// Il nickname deve essere univoco: si usa per cercare/aggiungere le
// persone giuste ai viaggi senza rischiare di scambiarle per omonimia.
export async function isNicknameTaken(nickname: string, excludeUid?: string): Promise<boolean> {
  const nicknameLower = nickname.trim().toLowerCase();
  if (!nicknameLower) return true;
  const snap = await getDocs(
    query(collection(getFirebaseDb(), "users"), where("nicknameLower", "==", nicknameLower), limit(2))
  );
  return snap.docs.some((d) => d.id !== excludeUid);
}

// Genera un nickname univoco a partire dal nome (best-effort: qualche
// tentativo con un suffisso numerico casuale, non è una riserva atomica
// ma la probabilità di collisione è trascurabile per questa scala d'uso).
export async function generateUniqueNickname(displayName: string): Promise<string> {
  const base = slugifyBase(displayName);
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = attempt === 0 ? "" : String(Math.floor(Math.random() * 9000) + 100);
    const candidate = `${base}${suffix}`;
    if (!(await isNicknameTaken(candidate))) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}
