import "server-only";
import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Due modi per passare le credenziali, per evitare il classico problema
// della private key PEM che perde gli "a capo" quando incollata come env
// var separata: FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 (l'intero JSON del
// service account, codificato in base64: nessun carattere speciale da
// preservare) ha la precedenza se presente; altrimenti si usano le tre
// variabili separate come prima.
function loadCredential(): ServiceAccount {
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
