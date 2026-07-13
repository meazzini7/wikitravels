"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { conversationKey, sendMessage } from "@/lib/chat";
import type { ChatMessage, UserProfile } from "@/lib/types";

export default function ChatThreadPage() {
  const params = useParams<{ uid: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    getDoc(doc(getFirebaseDb(), "users", params.uid))
      .then((snap) => {
        if (snap.exists()) setOtherUser(snap.data() as UserProfile);
      })
      .catch((err) => console.error("Impossibile caricare l'utente:", err));
  }, [params.uid]);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    const key = conversationKey(user.uid, params.uid);
    const q = query(collection(db, "chats", key, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
      },
      (err) => console.error("Impossibile ascoltare i messaggi:", err)
    );
  }, [user, params.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(user.uid, params.uid, text.trim());
      setText("");
    } finally {
      setSending(false);
    }
  }

  if (loading || !user) return null;

  return (
    <main className="mx-auto flex h-[calc(100vh-56px)] max-w-2xl flex-col px-4 py-4 sm:h-[calc(100vh-56px)]">
      <div className="mb-3 border-b border-gray-100 pb-3">
        <Link href={`/utenti/${params.uid}`} className="font-semibold text-gray-900 hover:text-brand-700">
          {otherUser?.displayName ?? "Viaggiatore"}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => {
            const mine = msg.senderId === user.uid;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.text}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Scrivi un messaggio..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="min-h-[44px] rounded-full bg-brand-600 px-5 font-medium text-white disabled:opacity-40"
        >
          Invia
        </button>
      </div>
    </main>
  );
}
