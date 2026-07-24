// Restituisce l'URL base del sito, ripulito da eventuali refusi nella
// variabile d'ambiente NEXT_PUBLIC_SITE_URL (es. una virgola o uno slash
// finale inseriti per errore su Vercel) che altrimenti romperebbero ogni
// URL costruito a partire da questo valore: link di invito, canonical,
// sitemap, Open Graph...
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = raw || "http://localhost:3000";
  return url.replace(/[,;\s]+$/, "").replace(/\/+$/, "");
}
