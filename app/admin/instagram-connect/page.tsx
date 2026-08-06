import { getSiteUrl } from "@/lib/site-url";

// Scopes della "Instagram API with Instagram Login" (lanciata da Meta a
// metà 2024): non richiede più che l'account Instagram sia collegato a
// una Pagina Facebook, a differenza del vecchio metodo.
const SCOPES = "instagram_business_basic,instagram_business_content_publish";

// Pagina protetta (stesso CRON_SECRET già usato per i cron): visitabile
// una tantum per autorizzare la pubblicazione automatica su Instagram,
// senza dover smanettare a mano tra i tool per sviluppatori di Meta.
export default function InstagramConnectPage({
  searchParams,
}: {
  searchParams: { secret?: string };
}) {
  const expected = process.env.CRON_SECRET;
  const authorized = !!expected && searchParams.secret === expected;

  if (!authorized) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-600">Non autorizzato.</p>
      </main>
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-600">
          Manca la variabile <code>INSTAGRAM_APP_ID</code> su Vercel: aggiungila e fai un Redeploy prima di
          continuare.
        </p>
      </main>
    );
  }

  const redirectUri = `${getSiteUrl()}/api/instagram/callback`;
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${SCOPES}`;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-bold text-gray-900">📸 Collega Instagram</h1>
      <p className="text-sm text-gray-500">
        Accedi con l&apos;account <strong>@wikitravels.it</strong> per autorizzare WikiTravels a pubblicare i
        nuovi articoli automaticamente.
      </p>
      <a
        href={authUrl}
        className="tap-scale rounded-2xl bg-brand-600 px-6 py-3 font-heading font-bold text-white shadow-pop"
      >
        Accedi con Instagram →
      </a>
    </main>
  );
}
