// Aggiunge i parametri UTM a un link condiviso sui social: senza, Google
// Analytics sa solo che la visita arriva da Facebook, con la campagna sa
// anche da QUALE post/argomento (vedi pannello admin).
export function withUtm(url: string, campaign: string, source = "facebook", medium = "social"): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}
