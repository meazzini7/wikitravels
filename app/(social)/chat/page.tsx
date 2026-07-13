"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
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
          <Link href="/login" className="font-medium text-brand-700">
            accedere
          </Link>{" "}
          per vedere i messaggi.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Messaggi</h1>
      {loadingChats ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">
          Nessuna conversazione. Vai al{" "}
          <Link href="/feed" className="text-brand-700 hover:underline">
            feed
          </Link>{" "}
          per trovare altri viaggiatori.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ chat, otherUser }) => (
            <li key={chat.id}>
              <Link
                href={`/chat/${otherUser?.uid ?? chat.participants[0]}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-3 hover:border-brand-200"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {otherUser?.displayName ?? "Viaggiatore"}
                  </p>
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
