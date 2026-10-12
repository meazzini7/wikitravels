import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { escapeHtml } from "@/lib/escape-html";
import { isValidOAuthState } from "@/lib/server/admin-auth";
import { saveInstagramConnection } from "@/lib/server/instagram-token";

function htmlPage(bodyHtml: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="it"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>Instagram · WikiTravels</title>
<style>
  body{font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#111;line-height:1.5}
  code{background:#f4f4f4;padding:10px;border-radius:8px;display:block;word-break:break-all;margin:6px 0 22px;font-size:13px;}
  label{font-weight:bold;display:block;margin-top:12px;}
  h1{color:#dd2166;}
</style>
</head><body>${bodyHtml}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
  );
}

// Callback OAuth per "Instagram API with Instagram Login": scambia il
// ?code= ricevuto per un token di lunga durata (60gg), lo SALVA in Firestore
// (dove poi viene rinnovato in automatico, vedi lib/server/instagram-token.ts)
// e mostra solo l'esito.
//
// Sicurezza: senza un "state" valido (derivato dal segreto, vedi
// makeOAuthState) la richiesta viene rifiutata PRIMA di fare o mostrare
// qualsiasi cosa, quindi nessuno può usare questo indirizzo per iniettare un
// proprio collegamento né per far comparire testo a piacere nella pagina.
// Ogni valore dinamico mostrato passa comunque da escapeHtml.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  if (!isValidOAuthState(params.get("state"))) {
    return htmlPage(
      `<h1>❌ Richiesta non valida</h1><p>Il collegamento di Instagram va avviato dalla pagina riservata /admin/instagram-connect.</p>`,
      400
    );
  }

  const code = params.get("code");
  const errorDescription = params.get("error_description") ?? params.get("error");

  if (errorDescription) {
    return htmlPage(`<h1>❌ Autorizzazione annullata</h1><p>${escapeHtml(errorDescription)}</p>`);
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
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(appSecret)}&access_token=${encodeURIComponent(shortData.access_token)}`
    );
    const longData = await longRes.json();
    if (!longRes.ok || !longData.access_token) {
      throw new Error(`Estensione del token fallita: ${JSON.stringify(longData)}`);
    }

    // 3. Recupera id + username dell'account per conferma visiva
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${encodeURIComponent(longData.access_token)}`
    );
    const meData = await meRes.json();
    if (!meRes.ok || !meData.id) {
      throw new Error(`Lettura dell'account fallita: ${JSON.stringify(meData)}`);
    }

    // 4. Salva il collegamento: da qui in poi si rinnova da solo ogni mese.
    try {
      await saveInstagramConnection({
        userId: String(meData.id),
        username: String(meData.username ?? ""),
        accessToken: longData.access_token,
        expiresInSeconds: Number(longData.expires_in) || undefined,
      });
    } catch (saveErr) {
      console.error("Salvataggio del collegamento Instagram su Firestore fallito:", saveErr);
      // Ripiego: mostra i valori da incollare a mano su Vercel (senza rinnovo
      // automatico), così il collegamento si può comunque completare.
      return htmlPage(`
        <h1>⚠️ Instagram collegato, ma non salvato in automatico: @${escapeHtml(meData.username ?? "?")}</h1>
        <p>Non sono riuscito a salvare il collegamento (rinnovo automatico non attivo). Per ora copia questi due valori nelle <strong>Environment Variables</strong> di Vercel e fai un Redeploy:</p>
        <label>INSTAGRAM_USER_ID</label>
        <code>${escapeHtml(meData.id)}</code>
        <label>INSTAGRAM_ACCESS_TOKEN</label>
        <code>${escapeHtml(longData.access_token)}</code>
        <p>Il token dura circa 60 giorni: dovrai ripetere questa procedura prima della scadenza.</p>
      `);
    }

    return htmlPage(`
      <h1>✅ Instagram collegato: @${escapeHtml(meData.username ?? "?")}</h1>
      <p>Fatto. Il collegamento è stato salvato e si <strong>rinnova da solo ogni mese</strong>: non devi copiare nulla su Vercel e non dovrai ripetere questa procedura.</p>
      <p>Puoi tornare al <em>Cruscotto</em>: il riquadro "Collegamenti" mostrerà Instagram in verde.</p>
    `);
  } catch (err) {
    console.error("Callback OAuth Instagram fallito:", err);
    return htmlPage(
      `<h1>❌ Qualcosa è andato storto</h1><p>${escapeHtml(err instanceof Error ? err.message : "Errore sconosciuto")}</p>`
    );
  }
}
