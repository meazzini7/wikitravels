"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import type { Notification } from "@/lib/types";

function timeAgo(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "adesso";
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h fa`;
  return `${Math.round(diffH / 24)} g fa`;
}

export default function NotifichePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingItems(false);
      return;
    }
    const db = getFirebaseDb();
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    getDocs(q)
      .then((snap) => {
        const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
        setItems(notifs);
        notifs
          .filter((n) => !n.read)
          .forEach((n) =>
            updateDoc(doc(db, "users", user.uid, "notifications", n.id), { read: true }).catch((err) =>
              console.error("Impossibile aggiornare la notifica:", err)
            )
          );
      })
      .catch((err) => console.error("Impossibile caricare le notifiche:", err))
      .finally(() => setLoadingItems(false));
  }, [user]);

  if (!loading && !user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-600">
          Devi{" "}
          <Link href="/login" className="font-medium text-brand-700">
            accedere
          </Link>{" "}
          per vedere le notifiche.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Notifiche</h1>
      {loadingItems ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Nessuna notifica per ora.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.type === "trip" && n.tripId ? `/viaggi/${n.tripId}` : `/utenti/${n.fromUid}`}
                className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${
                  n.read ? "border-gray-100" : "border-brand-200 bg-brand-50"
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {n.type === "trip" ? "🧳" : "👤"}
                </span>
                <p className="flex-1 text-sm text-gray-700">
                  {n.type === "trip" ? (
                    <>
                      <strong>{n.fromDisplayName}</strong> ha pubblicato un nuovo viaggio
                      {n.tripTitle ? `: ${n.tripTitle}` : ""}
                    </>
                  ) : (
                    <>
                      <strong>{n.fromDisplayName}</strong> ha iniziato a seguirti
                    </>
                  )}
                </p>
                <span className="shrink-0 text-xs text-gray-500">{timeAgo(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
