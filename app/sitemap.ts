import type { MetadataRoute } from "next";
import { getAdminDb } from "@/lib/firebase-admin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/enciclopedia`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const snap = await getAdminDb().collection("articles").where("status", "==", "published").get();
    const articleRoutes: MetadataRoute.Sitemap = snap.docs.map((d) => {
      const data = d.data();
      return {
        url: `${siteUrl}/enciclopedia/${d.id}`,
        lastModified: toDate(data.createdAt),
        changeFrequency: "weekly",
        priority: 0.7,
      };
    });
    return [...staticRoutes, ...articleRoutes];
  } catch (err) {
    console.error("Impossibile generare la sitemap degli articoli:", err);
    return staticRoutes;
  }
}
