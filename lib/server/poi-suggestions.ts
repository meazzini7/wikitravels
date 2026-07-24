import "server-only";
import { getAdminDb } from "../firebase-admin";
import { askGemini } from "./gemini";

// Normalizza il nome del luogo alla sola città/area (prima virgola,
// minuscolo): "Roma, Lazio" e "Roma, Italia" finiscono nella stessa cache,
// invece di richiamare Gemini due volte per lo stesso posto.
function placeKey(place: string): string {
  return (
    place
      .split(",")[0]
      ?.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "luogo"
  );
}

function parseNames(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[\s\-•*\d.)]+/, "").trim())
    .filter((line) => line.length > 0 && line.length < 80)
    .slice(0, 10);
}

// Suggerisce punti di interesse per un luogo (funziona per qualsiasi
// posto al mondo: non è un elenco statico, li genera l'AI). In cache su
// Firestore per nome luogo, così lo stesso posto richiesto da utenti
// diversi non richiama Gemini più di una volta. Passando `exclude` (nomi
// già mostrati, es. per il bottone "altri suggerimenti") si salta la
// cache e si chiede a Gemini di proporne di nuovi, che vengono comunque
// aggiunti alla cache per le prossime volte.
export async function getPoiSuggestions(place: string, exclude: string[] = []): Promise<string[]> {
  const key = placeKey(place);
  const ref = getAdminDb().collection("poiSuggestions").doc(key);

  const cached = await ref.get();
  const cachedNames: string[] = Array.isArray(cached.data()?.names) ? cached.data()!.names : [];

  if (exclude.length === 0 && cachedNames.length > 0) {
    return cachedNames;
  }

  const alreadyKnown = Array.from(new Set([...cachedNames, ...exclude]));
  const excludeText =
    alreadyKnown.length > 0 ? ` Non includere questi, già proposti in precedenza: ${alreadyKnown.join(", ")}.` : "";
  const prompt = `Elenca 8 punti di interesse turistici famosi e consigliati a "${place}".${excludeText} Rispondi SOLO con un elenco, un nome per riga, senza numeri, trattini, descrizioni o altro testo aggiuntivo.`;
  const raw = await askGemini(prompt, { retryOn429: false });
  const freshNames = parseNames(raw).filter(
    (name) => !alreadyKnown.some((known) => known.toLowerCase() === name.toLowerCase())
  );

  if (freshNames.length === 0) {
    throw new Error(`Nessun punto di interesse (nuovo) trovato per "${place}"`);
  }

  const updatedNames = Array.from(new Set([...cachedNames, ...freshNames]));
  ref
    .set({ place, names: updatedNames, createdAt: Date.now() })
    .catch((err) => console.error(`Impossibile salvare in cache i POI di ${place}:`, err));

  return exclude.length === 0 ? updatedNames : freshNames;
}
