import "server-only";

export interface UploadedImage {
  url: string;
  author: string;
  link: string;
  alt: string;
}

// Cerca una foto su Unsplash e restituisce direttamente il suo URL ospitato
// da Unsplash (nessun upload su Firebase Storage: evita di dover attivare
// il piano Blaze solo per questo). È il modo "ufficiale" suggerito da
// Unsplash quando si dà credito all'autore, cosa che già facciamo.
// Condivisa tra la generazione articoli enciclopedia e le copertine viaggio.
export async function fetchAndUploadImage(query: string): Promise<UploadedImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const searchRes = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      query
    )}&orientation=landscape&content_filter=high&client_id=${key}`,
    { headers: { "Accept-Version": "v1" } }
  );
  if (!searchRes.ok) return null;
  const photo = await searchRes.json();
  const imgUrl = photo?.urls?.regular;
  if (!imgUrl) return null;

  // Traccia il "download" secondo le linee guida API di Unsplash, senza
  // bloccare la risposta se fallisce.
  if (photo.links?.download_location) {
    fetch(`${photo.links.download_location}&client_id=${key}`).catch(() => {});
  }

  return {
    url: imgUrl,
    author: photo.user?.name ?? "Unsplash",
    link: photo.links?.html ?? "#",
    alt: photo.alt_description ?? query,
  };
}
