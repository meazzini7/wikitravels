import type { MetadataRoute } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

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
    { url: `${siteUrl}/info`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const [articlesSnap, tripsSnap] = await Promise.all([
      getAdminDb().collection("articles").where("status", "==", "published").get(),
      getAdminDb()
        .collection("trips")
        .where("status", "==", "published")
        .where("visibility", "==", "public")
        .get(),
    ]);
    const articleRoutes: MetadataRoute.Sitemap = articlesSnap.docs.map((d) => {
      const data = d.data();
      return {
        url: `${siteUrl}/enciclopedia/${d.id}`,
        lastModified: toDate(data.createdAt),
        changeFrequency: "weekly",
        priority: 0.7,
      };
    });
    // Anche i viaggi pubblici sono contenuto indicizzabile (itinerari reali
    // creati dagli utenti): stessa logica degli articoli.
    const tripRoutes: MetadataRoute.Sitemap = tripsSnap.docs.map((d) => {
      const data = d.data();
      return {
        url: `${siteUrl}/viaggi/${d.id}`,
        lastModified: typeof data.updatedAt === "number" ? new Date(data.updatedAt) : undefined,
        changeFrequency: "monthly",
        priority: 0.5,
      };
    });
    return [...staticRoutes, ...articleRoutes, ...tripRoutes];
  } catch (err) {
    console.error("Impossibile generare la sitemap degli articoli/viaggi:", err);
    return staticRoutes;
  }
}
