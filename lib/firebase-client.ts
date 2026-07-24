"use client";

import { type FirebaseApp, type FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

// Lazy: i Client Component vengono comunque renderizzati lato server (SSR/SSG)
// da Next.js. L'SDK Firebase va creato solo quando serve davvero, dentro un
// effect o un event handler (quindi solo nel browser), altrimenti build/SSR
// falliscono senza una vera API key.
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

// Cache locale persistente (IndexedDB): senza, ogni pagina caricata da zero
// (refresh, primo accesso, link diretto) deve riaprire da capo la
// connessione a Firestore e riscaricare tutto prima di poter mostrare
// qualcosa, il che si percepisce come lentezza soprattutto su rete mobile.
// Con la cache, i dati già visti si vedono subito mentre quelli freschi
// arrivano dietro. Il fallback alla cache in memoria copre i rari browser
// che non supportano IndexedDB (es. alcune modalità di navigazione privata).
export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch (err) {
      console.error("Cache persistente di Firestore non disponibile, uso quella in memoria:", err);
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) storageInstance = getStorage(getFirebaseApp());
  return storageInstance;
}
