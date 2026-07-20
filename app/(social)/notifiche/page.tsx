"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import PageHero from "@/components/ui/PageHero";
import EmptyState from "@/components/ui/EmptyState";
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
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHero eyebrow="Aggiornamenti" title="Notifiche 🔔" className="mb-6" />
      {loadingItems ? (
        <div className="h-24 animate-pulse rounded-3xl bg-gray-100" />
      ) : items.length === 0 ? (
        <EmptyState title="Nessuna notifica per ora" description="Quando qualcuno ti segue o pubblica un viaggio, lo vedrai qui." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.type === "trip" && n.tripId ? `/viaggi/${n.tripId}` : `/utenti/${n.fromUid}`}
                className={`tap-scale flex items-center gap-3 rounded-2xl border-2 px-3 py-3 ${
                  n.read ? "border-transparent bg-white/70" : "border-brand-200 bg-brand-50"
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm" aria-hidden>
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
                <span className="shrink-0 text-xs font-semibold text-gray-400">{timeAgo(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
