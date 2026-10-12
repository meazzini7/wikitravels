import "server-only";

const GRAPH_VERSION = "v21.0";

export interface HealthItem {
  key: "facebook" | "instagram";
  label: string;
  ok: boolean;
  detail: string;
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

// Verifica che i token usati dai post automatici siano ancora validi. Il
// token Instagram dura circa 60 giorni: se scade i post Instagram falliscono
// in silenzio (l'articolo esce comunque), quindi meglio vederlo qui.
export async function checkSocialHealth(): Promise<HealthItem[]> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  const [facebook, instagram] = await Promise.all([
    pageId && fbToken
      ? probe(
          `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=name&access_token=${encodeURIComponent(fbToken)}`,
          (d) => `Pagina "${String(d.name ?? "")}" raggiungibile`
        )
      : Promise.resolve({ ok: false, detail: "Non configurato su Vercel" }),
    igToken
      ? probe(
          `https://graph.instagram.com/${GRAPH_VERSION}/me?fields=username&access_token=${encodeURIComponent(igToken)}`,
          (d) => `Account @${String(d.username ?? "")} raggiungibile`
        )
      : Promise.resolve({ ok: false, detail: "Non configurato su Vercel" }),
  ]);

  return [
    { key: "facebook", label: "Pubblicazione su Facebook", ...facebook },
    { key: "instagram", label: "Pubblicazione su Instagram", ...instagram },
  ];
}
