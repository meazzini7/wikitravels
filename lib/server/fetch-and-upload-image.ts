import "server-only";
import { getAdminStorage } from "../firebase-admin";

export interface UploadedImage {
  url: string;
  author: string;
  link: string;
  alt: string;
}

// Cerca una foto su Unsplash e la carica su Firebase Storage al path dato.
// Condiviso tra la generazione articoli enciclopedia e le copertine viaggio.
export async function fetchAndUploadImage(
  query: string,
  path: string
): Promise<UploadedImage | null> {
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

  const imgRes = await fetch(imgUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const bucket = getAdminStorage().bucket();
  const file = bucket.file(path);
  await file.save(buffer, { contentType: "image/jpeg", public: true });

  return {
    url: file.publicUrl(),
    author: photo.user?.name ?? "Unsplash",
    link: photo.links?.html ?? "#",
    alt: photo.alt_description ?? query,
  };
}
