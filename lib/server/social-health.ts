import "server-only";
import { getInstagramCredentials } from "./instagram-token";

const GRAPH_VERSION = "v21.0";

export interface HealthItem {
  key: "facebook" | "instagram";
  label: string;
  ok: boolean;
  detail: string;
  // Riga informativa facoltativa (es. scadenza e rinnovo automatico).
  note?: string;
}

async function probe(url: string, okDetail: (data: Record<string, unknown>) => string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
    if (res.ok) return { ok: true, detail: okDetail(data) };
    return { ok: false, detail: data.error?.message ?? `Risposta HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Errore di rete" };
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "long", year: "numeric" });
}

// Verifica che i token usati dai post automatici siano ancora validi. Il
// collegamento Instagram si rinnova da solo ogni mese (vedi
// instagram-token.ts), ma se per qualche motivo il rinnovo non riesce o il
// collegamento è scaduto, i post Instagram fallirebbero in silenzio (l'articolo
// esce comunque): meglio vederlo qui.
export async function checkSocialHealth(): Promise<HealthItem[]> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  // Sola lettura: il controllo non deve mai avviare un rinnovo.
  const ig = await getInstagramCredentials({ refresh: false });

  const [facebook, instagram] = await Promise.all([
    pageId && fbToken
      ? probe(
          `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=name&access_token=${encodeURIComponent(fbToken)}`,
          (d) => `Pagina "${String(d.name ?? "")}" raggiungibile`
        )
      : Promise.resolve({ ok: false, detail: "Non configurato su Vercel" }),
    ig
      ? probe(
          `https://graph.instagram.com/${GRAPH_VERSION}/me?fields=username&access_token=${encodeURIComponent(ig.token)}`,
          (d) => `Account @${String(d.username ?? "")} raggiungibile`
        )
      : Promise.resolve({ ok: false, detail: "Non collegato: usa il pulsante per collegarlo" }),
  ]);

  let instagramNote: string | undefined;
  if (ig?.source === "firestore") {
    instagramNote = `Rinnovo automatico attivo${ig.expiresAt ? ` · valido fino al ${formatDate(ig.expiresAt)}` : ""}`;
    if (ig.lastError) instagramNote += ` · ultimo tentativo di rinnovo fallito (${ig.lastError})`;
  } else if (ig?.source === "env") {
    instagramNote = "Collegamento manuale, senza rinnovo automatico: ricollegalo dal pulsante per attivarlo";
  }

  return [
    { key: "facebook", label: "Pubblicazione su Facebook", ...facebook },
    { key: "instagram", label: "Pubblicazione su Instagram", ...instagram, note: instagramNote },
  ];
}
