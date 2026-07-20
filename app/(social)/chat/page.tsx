"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import FlamingoMascot from "@/components/FlamingoMascot";
import PageHero from "@/components/ui/PageHero";
import EmptyState from "@/components/ui/EmptyState";
import type { ChatSummary, UserProfile } from "@/lib/types";

interface ConversationRow {
  chat: ChatSummary;
  otherUser: UserProfile | null;
}

export default function ChatListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingChats(false);
      return;
    }
    const db = getFirebaseDb();
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatSummary);
          const withUsers = await Promise.all(
            chats.map(async (chat) => {
              const otherUid = chat.participants.find((p) => p !== user.uid) ?? chat.participants[0];
              const otherSnap = await getDoc(doc(db, "users", otherUid));
              return { chat, otherUser: otherSnap.exists() ? (otherSnap.data() as UserProfile) : null };
            })
          );
          setRows(withUsers);
        } catch (err) {
          console.error("Impossibile caricare le conversazioni:", err);
        }
        setLoadingChats(false);
      },
      (err) => {
        console.error("Impossibile ascoltare le conversazioni:", err);
        setLoadingChats(false);
      }
    );
    return unsub;
  }, [user]);

  if (!loading && !user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-600">
          Devi{" "}
          <Link href="/login" className="font-bold text-brand-700">
            accedere
          </Link>{" "}
          per vedere i messaggi.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHero eyebrow="Connettiti" title="Messaggi 💬" className="mb-6" />
      {loadingChats ? (
        <div className="h-24 animate-pulse rounded-3xl bg-gray-100" />
      ) : rows.length === 0 ? (
        <EmptyState title="Nessuna conversazione" description="Trova altri viaggiatori nel feed e inizia a chattare.">
          <Link
            href="/feed"
            className="tap-scale mt-2 flex min-h-[44px] items-center rounded-full bg-brand-600 px-5 font-bold text-white shadow-pop"
          >
            🧭 Vai al feed
          </Link>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ chat, otherUser }) => (
            <li key={chat.id}>
              <Link
                href={`/chat/${otherUser?.uid ?? chat.participants[0]}`}
                className="tap-scale card-surface flex items-center gap-3 px-3 py-3 hover:border-brand-200"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-50">
                  {otherUser?.photoURL ? (
                    <Image src={otherUser.photoURL} alt={otherUser.displayName} fill className="object-cover" sizes="44px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-900">{otherUser?.displayName ?? "Viaggiatore"}</p>
                  <p className="truncate text-sm text-gray-500">{chat.lastMessage}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
