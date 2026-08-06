import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

function htmlPage(bodyHtml: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="it"><head><meta charset="utf-8" /><title>Instagram · WikiTravels</title>
<style>
  body{font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#111}
  code{background:#f4f4f4;padding:10px;border-radius:8px;display:block;word-break:break-all;margin:6px 0 22px;font-size:13px;}
  label{font-weight:bold;display:block;margin-top:12px;}
  h1{color:#dd2166;}
</style>
</head><body>${bodyHtml}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// Callback OAuth per "Instagram API with Instagram Login": scambia il
// ?code= ricevuto per un token di lunga durata (60gg) e mostra i valori
// da incollare su Vercel. Non salva né trasmette altrove il token: viene
// solo mostrato una volta in questa pagina, protetta dal fatto che solo
// chi conosce il proprio account Instagram può completare il login che
// genera il "code" in arrivo qui.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const errorDescription =
    req.nextUrl.searchParams.get("error_description") ?? req.nextUrl.searchParams.get("error");

  if (errorDescription) {
    return htmlPage(`<h1>❌ Autorizzazione annullata</h1><p>${errorDescription}</p>`);
  }
  if (!code) {
    return htmlPage(`<h1>❌ Codice mancante</h1><p>Riprova da /admin/instagram-connect.</p>`);
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    return htmlPage(`<h1>❌ Configurazione mancante</h1><p>INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET non impostate su Vercel.</p>`);
  }

  const redirectUri = `${getSiteUrl()}/api/instagram/callback`;

  try {
    // 1. Scambia il code per un token a breve durata (~1h)
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const shortData = await shortRes.json();
    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(`Scambio del code fallito: ${JSON.stringify(shortData)}`);
    }

    // 2. Estende il token a lunga durata (~60 giorni)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortData.access_token}`
    );
    const longData = await longRes.json();
    if (!longRes.ok || !longData.access_token) {
      throw new Error(`Estensione del token fallita: ${JSON.stringify(longData)}`);
    }

    // 3. Recupera id + username dell'account per conferma visiva
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longData.access_token}`
    );
    const meData = await meRes.json();

    return htmlPage(`
      <h1>✅ Instagram collegato: @${meData.username ?? "?"}</h1>
      <p>Copia questi due valori nelle <strong>Environment Variables</strong> di Vercel (Settings → Environment Variables), poi fai un Redeploy:</p>
      <label>INSTAGRAM_USER_ID</label>
      <code>${meData.id ?? ""}</code>
      <label>INSTAGRAM_ACCESS_TOKEN</label>
      <code>${longData.access_token}</code>
      <p>Il token dura circa 60 giorni. Quando si avvicina alla scadenza, ripeti questa procedura da /admin/instagram-connect per generarne uno nuovo.</p>
    `);
  } catch (err) {
    console.error("Callback OAuth Instagram fallito:", err);
    return htmlPage(
      `<h1>❌ Qualcosa è andato storto</h1><p>${err instanceof Error ? err.message : "Errore sconosciuto"}</p>`
    );
  }
}
