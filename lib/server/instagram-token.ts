import "server-only";
import { getAdminDb } from "../firebase-admin";

// Il token Instagram dura 60 giorni e va "rinfrescato" prima che scada
// (graph.instagram.com/refresh_access_token, possibile solo con un token
// ancora valido e vecchio di almeno 24 ore). Il collegamento fatto da
// /admin/instagram-connect viene quindi salvato in Firestore
// (config/instagram, non leggibile dal client: le regole negano tutto ciò che
// non è elencato) e rinnovato automaticamente ogni 30 giorni dai cron di
// pubblicazione, così non scade più. Le variabili INSTAGRAM_USER_ID /
// INSTAGRAM_ACCESS_TOKEN su Vercel restano solo come ripiego manuale, senza
// rinnovo.

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = 30 * DAY_MS;
// Dopo un rinnovo fallito non si riprova a ogni post: al massimo ogni 12 ore.
const RETRY_AFTER_MS = 12 * 60 * 60 * 1000;
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 24 * 60 * 60;

export interface InstagramConnection {
  userId: string;
  username: string;
  accessToken: string;
  connectedAt: number;
  refreshedAt: number;
  expiresAt: number;
  lastAttemptAt: number | null;
  lastError: string | null;
}

export interface InstagramCredentials {
  userId: string;
  token: string;
  source: "firestore" | "env";
  refreshedAt: number | null;
  expiresAt: number | null;
  lastError: string | null;
}

function connectionRef() {
  return getAdminDb().collection("config").doc("instagram");
}

export async function saveInstagramConnection(input: {
  userId: string;
  username: string;
  accessToken: string;
  expiresInSeconds?: number;
}): Promise<void> {
  const now = Date.now();
  const connection: InstagramConnection = {
    userId: input.userId,
    username: input.username,
    accessToken: input.accessToken,
    connectedAt: now,
    refreshedAt: now,
    expiresAt: now + (input.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS) * 1000,
    lastAttemptAt: null,
    lastError: null,
  };
  await connectionRef().set(connection);
}

async function readConnection(): Promise<InstagramConnection | null> {
  try {
    const snap = await connectionRef().get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<InstagramConnection>;
    if (!data.accessToken || !data.userId) return null;
    return {
      userId: data.userId,
      username: data.username ?? "",
      accessToken: data.accessToken,
      connectedAt: data.connectedAt ?? 0,
      refreshedAt: data.refreshedAt ?? 0,
      expiresAt: data.expiresAt ?? 0,
      lastAttemptAt: data.lastAttemptAt ?? null,
      lastError: data.lastError ?? null,
    };
  } catch (err) {
    console.error("Impossibile leggere il collegamento Instagram da Firestore:", err);
    return null;
  }
}

// Rinnova il token se sono passati 30 giorni dall'ultimo rinnovo. Un
// fallimento non è mai fatale: si continua con il token attuale (che resta
// valido fino alla sua scadenza) e si riprova più tardi.
async function refreshIfDue(conn: InstagramConnection): Promise<InstagramConnection> {
  const now = Date.now();
  if (now - conn.refreshedAt < REFRESH_AFTER_MS) return conn;
  if (conn.lastAttemptAt && now - conn.lastAttemptAt < RETRY_AFTER_MS) return conn;

  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(conn.accessToken)}`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" }
    );
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (!res.ok || !data.access_token) {
      throw new Error(data.error?.message ?? `Risposta HTTP ${res.status}`);
    }
    const updated: InstagramConnection = {
      ...conn,
      accessToken: data.access_token,
      refreshedAt: now,
      expiresAt: now + (Number(data.expires_in) || DEFAULT_EXPIRES_IN_SECONDS) * 1000,
      lastAttemptAt: now,
      lastError: null,
    };
    await connectionRef().set(updated);
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Rinnovo automatico del token Instagram fallito:", message);
    await connectionRef()
      .set({ lastAttemptAt: now, lastError: message }, { merge: true })
      .catch(() => {});
    return { ...conn, lastAttemptAt: now, lastError: message };
  }
}

// Credenziali da usare adesso. Con refresh=true (chi pubblica) tenta anche il
// rinnovo se è dovuto; con refresh=false (controllo di salute) è solo lettura.
export async function getInstagramCredentials(options: { refresh: boolean }): Promise<InstagramCredentials | null> {
  const stored = await readConnection();
  if (stored) {
    const current = options.refresh ? await refreshIfDue(stored) : stored;
    return {
      userId: current.userId,
      token: current.accessToken,
      source: "firestore",
      refreshedAt: current.refreshedAt,
      expiresAt: current.expiresAt,
      lastError: current.lastError,
    };
  }

  const userId = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!userId || !token) return null;
  return { userId, token, source: "env", refreshedAt: null, expiresAt: null, lastError: null };
}
