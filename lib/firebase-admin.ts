import "server-only";
import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Tre modi per passare le credenziali, dal più al meno semplice da
// incollare senza errori:
// 1. FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON: l'intero file JSON del service
//    account incollato così com'è (nessuna trasformazione richiesta).
// 2. FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64: lo stesso JSON codificato in
//    base64 (un unico blocco senza ritorni a capo, utile se il contesto
//    di deploy non gestisce bene i valori multilinea).
// 3. FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY separate
//    (richiede di preservare a mano gli "\n" nella chiave, più fragile).
function loadCredential(): ServiceAccount {
  const rawJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  const base64Json = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
  if (base64Json) {
    const parsed = JSON.parse(Buffer.from(base64Json, "base64").toString("utf-8"));
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}

// Inizializzazione lazy: il credential parsing avviene solo alla prima
// chiamata a runtime, non al momento dell'import del modulo. Questo evita
// che `next build` fallisca in assenza delle env var admin (es. in CI).
function getAdminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert(loadCredential()),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
