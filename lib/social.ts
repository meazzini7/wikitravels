"use client";

import { addDoc, collection, doc, getDocs, increment, query, where, writeBatch } from "firebase/firestore";
import { getFirebaseDb } from "./firebase-client";
import { destinationMatchKeys } from "./dream-destinations";
import type { UserProfile } from "./types";

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
    articleSlug: null,
    articleTitle: null,
    destinationName: null,
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
        articleSlug: null,
        articleTitle: null,
        destinationName: null,
        createdAt: Date.now(),
        read: false,
      })
    )
  );
}

interface DreamMatchStop {
  name: string;
  countryCode: string;
}

// Alla pubblicazione di un viaggio pubblico, avvisa chi ha salvato una di
// queste tappe tra le proprie mete dei sogni (indipendentemente dal fatto
// che segua o meno l'autore). Firestore limita "array-contains-any" a 10
// valori: con più tappe si usano solo le prime 10 chiavi di match.
export async function notifyDreamDestinationMatches(
  authorUid: string,
  trip: NewTripInfo,
  stops: DreamMatchStop[]
) {
  const db = getFirebaseDb();
  const keys = Array.from(new Set(stops.flatMap((s) => destinationMatchKeys(s.name, s.countryCode)))).slice(0, 10);
  if (keys.length === 0) return;

  const snap = await getDocs(query(collection(db, "users"), where("dreamDestinationKeys", "array-contains-any", keys)));
  await Promise.all(
    snap.docs
      .filter((d) => d.id !== authorUid)
      .map((d) => {
        const target = d.data() as UserProfile;
        const matched = target.dreamDestinations?.find((dream) =>
          destinationMatchKeys(dream.name, dream.countryCode).some((k) => keys.includes(k))
        );
        return addDoc(collection(db, "users", d.id, "notifications"), {
          type: "dream_trip",
          fromUid: authorUid,
          fromDisplayName: trip.authorDisplayName,
          fromPhotoURL: trip.authorPhotoURL,
          tripId: trip.tripId,
          tripTitle: trip.tripTitle,
          articleSlug: null,
          articleTitle: null,
          destinationName: matched?.name ?? null,
          createdAt: Date.now(),
          read: false,
        });
      })
  );
}
