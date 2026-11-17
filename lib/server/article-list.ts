import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminDb } from "../firebase-admin";
import type { ArticleCard } from "../article-html";

// Elenco leggero di tutti gli articoli pubblicati (solo i campi delle card,
// mai il testo), dal più recente. Condiviso in Data Cache tra home e pagine
// articolo, così non si rilegge Firestore a ogni visita. Dura un'ora, come la
// rigenerazione di home ed enciclopedia (i cron su GitHub Actions non possono
// invalidarla); la riscrittura dal pannello la invalida subito (tag "articles").
export const getArticleCards = unstable_cache(
  async (): Promise<ArticleCard[]> => {
    try {
      const snap = await getAdminDb()
        .collection("articles")
        .where("status", "==", "published")
        .orderBy("createdAt", "desc")
        .select("slug", "title", "destination", "vibe", "coverImageUrl", "seo")
        .limit(300)
        .get();
      return snap.docs.map((d) => {
        const a = d.data();
        return {
          slug: a.slug ?? d.id,
          title: a.title ?? "",
          destination: a.destination ?? "",
          vibe: a.vibe ?? "",
          coverImageUrl: a.coverImageUrl ?? null,
          description: a.seo?.metaDescription ?? "",
        };
      });
    } catch (err) {
      console.error("Impossibile caricare l'elenco degli articoli:", err);
      return [];
    }
  },
  ["article-cards-v2"],
  { revalidate: 3600, tags: ["articles"] }
);
