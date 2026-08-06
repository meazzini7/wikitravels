import "server-only";

const GRAPH_VERSION = "v21.0";

export type SocialPostResult = { ok: boolean; error?: string };

// Pubblica un post sulla Pagina Facebook. Richiede FACEBOOK_PAGE_ID e un
// token della Pagina di lunga durata (generato una tantum da Graph API
// Explorer, vedi .env.example). Un fallimento qui non deve mai bloccare la
// generazione dell'articolo: il chiamante logga/espone l'errore ma l'esito
// dell'articolo resta comunque positivo. Il motivo del fallimento viene
// restituito (non solo loggato) così da poterlo vedere anche solo aprendo
// la risposta JSON del cron nel browser, senza dover aprire i log di Vercel.
export async function postToFacebookPage({ message, link }: { message: string; link: string }): Promise<SocialPostResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    const error = "FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN non configurate su Vercel.";
    console.error(error);
    return { ok: false, error };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, link, access_token: token }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Pubblicazione su Facebook fallita:", text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("Errore durante la pubblicazione su Facebook:", err);
    return { ok: false, error };
  }
}

// Pubblica una foto (con didascalia) sull'account Instagram collegato,
// via "Instagram API with Instagram Login" (non richiede una Pagina
// Facebook collegata). Richiede INSTAGRAM_USER_ID e un token ottenuto
// visitando /admin/instagram-connect. Due passaggi come da API: crea il
// "contenitore" media, poi lo pubblica.
export async function postToInstagram({ imageUrl, caption }: { imageUrl: string; caption: string }): Promise<SocialPostResult> {
  const userId = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!userId || !token) {
    const error = "INSTAGRAM_USER_ID o INSTAGRAM_ACCESS_TOKEN non configurate su Vercel.";
    console.error(error);
    return { ok: false, error };
  }

  try {
    const createRes = await fetch(`https://graph.instagram.com/${GRAPH_VERSION}/${userId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.id) {
      console.error("Creazione contenitore media Instagram fallita:", createData);
      return { ok: false, error: JSON.stringify(createData) };
    }

    const publishRes = await fetch(`https://graph.instagram.com/${GRAPH_VERSION}/${userId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: createData.id, access_token: token }),
    });
    if (!publishRes.ok) {
      const text = await publishRes.text();
      console.error("Pubblicazione su Instagram fallita:", text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("Errore durante la pubblicazione su Instagram:", err);
    return { ok: false, error };
  }
}
