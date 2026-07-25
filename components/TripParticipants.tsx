"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import {
  acceptTripInvite,
  declineTripInvite,
  inviteTripParticipant,
  searchUsersByNickname,
} from "@/lib/social";
import type { TripParticipant, UserProfile } from "@/lib/types";
import FlamingoMascot from "@/components/FlamingoMascot";
import FloatingPanel from "@/components/ui/FloatingPanel";

interface TripParticipantsProps {
  tripId: string;
  tripTitle: string;
  isOwner: boolean;
}

// Prima questi errori finivano solo in console.error: invisibile per chi
// non apre gli strumenti sviluppatore, quindi "clicco invita e non succede
// nulla" restava impossibile da capire. "permission-denied" in particolare
// è il sintomo tipico di regole di sicurezza Firestore non aggiornate sul
// progetto Firebase live (questo repo le tiene solo come riferimento: vanno
// incollate a mano nella Console Firebase, non si aggiornano da sole).
function mapFirestoreError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  if (code === "permission-denied") {
    return "Non hai i permessi per farlo. Se il problema persiste, potrebbero servire le regole Firestore aggiornate sul progetto.";
  }
  return "Non sono riuscito a completare l'operazione. Riprova.";
}

// Invitare qualcuno a un viaggio: l'invitato riceve una notifica, accetta
// (o rifiuta) direttamente da qui, e da quel momento compare nell'elenco
// dei partecipanti del viaggio.
export default function TripParticipants({ tripId, tripTitle, isOwner }: TripParticipantsProps) {
  const { user, profile } = useAuth();
  const [participants, setParticipants] = useState<TripParticipant[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  async function reload() {
    const snap = await getDocs(collection(getFirebaseDb(), "trips", tripId, "participants"));
    setParticipants(snap.docs.map((d) => d.data() as TripParticipant));
    setLoadingList(false);
  }

  useEffect(() => {
    reload().catch((err) => {
      console.error("Impossibile caricare i partecipanti:", err);
      setLoadingList(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (searchText.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsersByNickname(searchText)
        .then((users) => setSearchResults(users.filter((u) => u.uid !== user?.uid)))
        .catch(() => setSearchResults([]));
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchText, user?.uid]);

  async function invite(target: UserProfile) {
    if (!user || !profile) return;
    setInviting(target.uid);
    setError(null);
    try {
      await inviteTripParticipant(
        tripId,
        tripTitle,
        { uid: user.uid, nickname: profile.nickname, photoURL: profile.photoURL },
        { uid: target.uid, nickname: target.nickname, photoURL: target.photoURL }
      );
      setSearchText("");
      setSearchResults([]);
      await reload();
    } catch (err) {
      console.error("Impossibile invitare l'utente:", err);
      setError(mapFirestoreError(err));
    } finally {
      setInviting(null);
    }
  }

  async function respond(accept: boolean) {
    if (!user) return;
    setResponding(true);
    setError(null);
    try {
      if (accept) await acceptTripInvite(tripId, user.uid);
      else await declineTripInvite(tripId, user.uid);
      await reload();
    } catch (err) {
      console.error("Impossibile rispondere all'invito:", err);
      setError(mapFirestoreError(err));
    } finally {
      setResponding(false);
    }
  }

  if (loadingList) return <div className="h-16 w-full animate-pulse rounded-2xl bg-gray-100" />;

  const myInvite = user ? participants.find((p) => p.uid === user.uid && p.status === "invited") : undefined;
  const accepted = participants.filter((p) => p.status === "accepted");
  const invited = participants.filter((p) => p.status === "invited");

  return (
    <div className="card-surface mb-6 p-4 sm:p-5">
      <h2 className="mb-3 font-heading text-sm font-bold text-gray-700">👥 Partecipanti</h2>

      {error && (
        <p className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>
      )}

      {myInvite && (
        <div className="mb-3 rounded-2xl border-2 border-brand-200 bg-brand-50 p-3 text-sm">
          <p className="mb-2 font-semibold text-brand-700">Sei stato invitato a questo viaggio!</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => respond(true)}
              disabled={responding}
              className="tap-scale flex-1 rounded-full bg-brand-600 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Accetta
            </button>
            <button
              type="button"
              onClick={() => respond(false)}
              disabled={responding}
              className="tap-scale flex-1 rounded-full border-2 border-gray-200 py-2 text-xs font-bold text-gray-600 disabled:opacity-50"
            >
              Rifiuta
            </button>
          </div>
        </div>
      )}

      {accepted.length === 0 && invited.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun partecipante ancora, solo l&apos;autore.</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-2">
          {accepted.map((p) => (
            <li
              key={p.uid}
              className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-3 text-sm font-bold text-brand-700"
            >
              <span className="relative h-6 w-6 overflow-hidden rounded-full bg-white">
                {p.photoURL ? (
                  <Image src={p.photoURL} alt={p.nickname} fill className="object-cover" sizes="24px" />
                ) : (
                  <FlamingoMascot className="h-full w-full p-0.5 text-brand-300" />
                )}
              </span>
              @{p.nickname}
            </li>
          ))}
          {isOwner &&
            invited.map((p) => (
              <li
                key={p.uid}
                className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-sm font-semibold text-gray-500"
              >
                <span className="relative h-6 w-6 overflow-hidden rounded-full bg-white">
                  {p.photoURL ? (
                    <Image src={p.photoURL} alt={p.nickname} fill className="object-cover" sizes="24px" />
                  ) : (
                    <FlamingoMascot className="h-full w-full p-0.5 text-gray-300" />
                  )}
                </span>
                @{p.nickname} · in attesa
              </li>
            ))}
        </ul>
      )}

      {isOwner && (
        <div ref={searchWrapperRef} className="relative">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cerca per nickname (es. marco92)..."
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <FloatingPanel anchorRef={searchWrapperRef} open={searchResults.length > 0}>
            <ul className="mt-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
              {searchResults.map((result) => (
                <li key={result.uid}>
                  <button
                    type="button"
                    onClick={() => invite(result)}
                    disabled={inviting === result.uid || participants.some((p) => p.uid === result.uid)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:opacity-50"
                  >
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-brand-50">
                      {result.photoURL ? (
                        <Image src={result.photoURL} alt={result.nickname} fill className="object-cover" sizes="28px" />
                      ) : (
                        <FlamingoMascot className="h-full w-full p-1 text-brand-300" />
                      )}
                    </span>
                    <span className="flex-1 truncate font-semibold text-gray-800">@{result.nickname}</span>
                    <span className="text-xs font-bold text-brand-600">
                      {participants.some((p) => p.uid === result.uid) ? "già invitato" : "invita"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </FloatingPanel>
        </div>
      )}
    </div>
  );
}
