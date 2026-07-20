"use client";

import { addDoc, collection, doc, getDocs, increment, query, where, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "./firebase-client";

export async function followUser(
  currentUid: string,
  currentDisplayName: string,
  currentPhotoURL: string | null,
  targetUid: string
) {
  const db = getFirebaseDb();
  const followId = `${currentUid}_${targetUid}`;
  const batch = writeBatch(db);
  batch.set(doc(db, "follows", followId), {
    followerId: currentUid,
    followingId: targetUid,
    createdAt: Date.now(),
  });
  batch.update(doc(db, "users", currentUid), { "stats.followingCount": increment(1) });
  batch.update(doc(db, "users", targetUid), { "stats.followersCount": increment(1) });
  await batch.commit();

  await addDoc(collection(db, "users", targetUid, "notifications"), {
    type: "follow",
    fromUid: currentUid,
    fromDisplayName: currentDisplayName,
    fromPhotoURL: currentPhotoURL,
    tripId: null,
    tripTitle: null,
    createdAt: Date.now(),
    read: false,
  });
}

export async function unfollowUser(currentUid: string, targetUid: string) {
  const db = getFirebaseDb();
  const followId = `${currentUid}_${targetUid}`;
  const batch = writeBatch(db);
  batch.delete(doc(db, "follows", followId));
  batch.update(doc(db, "users", currentUid), { "stats.followingCount": increment(-1) });
  batch.update(doc(db, "users", targetUid), { "stats.followersCount": increment(-1) });
  await batch.commit();
}

interface NewTripInfo {
  tripId: string;
  tripTitle: string;
  authorDisplayName: string;
  authorPhotoURL: string | null;
}

// Alla pubblicazione di un viaggio pubblico, avvisa chi segue l'autore.
export async function notifyFollowersOfNewTrip(authorUid: string, trip: NewTripInfo) {
  const db = getFirebaseDb();
  const followsSnap = await getDocs(query(collection(db, "follows"), where("followingId", "==", authorUid)));
  await Promise.all(
    followsSnap.docs.map((followDoc) =>
      addDoc(collection(db, "users", followDoc.data().followerId, "notifications"), {
        type: "trip",
        fromUid: authorUid,
        fromDisplayName: trip.authorDisplayName,
        fromPhotoURL: trip.authorPhotoURL,
        tripId: trip.tripId,
        tripTitle: trip.tripTitle,
        createdAt: Date.now(),
        read: false,
      })
    )
  );
}
