"use client";

import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase-client";

export function conversationKey(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export async function sendMessage(currentUid: string, otherUid: string, text: string) {
  const db = getFirebaseDb();
  const key = conversationKey(currentUid, otherUid);
  await setDoc(
    doc(db, "chats", key),
    {
      participants: [currentUid, otherUid],
      lastMessage: text,
      lastMessageAt: Date.now(),
    },
    { merge: true }
  );
  await addDoc(collection(db, "chats", key, "messages"), {
    senderId: currentUid,
    text,
    createdAt: Date.now(),
  });
}
