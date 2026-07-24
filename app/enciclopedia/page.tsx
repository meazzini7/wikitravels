import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import FlamingoMascot from "@/components/FlamingoMascot";
import RecommendedArticles from "@/components/RecommendedArticles";
import { INTEREST_ICONS, INTEREST_LABELS, topInterests } from "@/lib/interests";
import type { Article } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Enciclopedia dei viaggi",
  description:
    "Guide di viaggio su destinazioni di tutto il mondo: cosa vedere, dove mangiare e i segreti dei local, aggiornate ogni giorno.",
};

async function getArticles(): Promise<Article[]> {
  try {
    const snap = await getAdminDb()
      .collection("articles")
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .limit(60)
      .get();
    return snap.docs.map((d) => d.data() as Article);
  } catch (err) {
    console.error("Impossibile caricare gli articoli:", err);
    return [];
  }
}

export default async function EnciclopediaPage() {
  const articles = await getArticles();
  const dict = getDictionary(getServerLocale()).enciclopedia;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="relative mb-8 overflow-hidden rounded-4xl bg-gradient-to-br from-lagoon-600 via-lagoon-500 to-brand-500 px-6 py-8 text-center text-white shadow-pop sm:px-10 sm:py-10">
        <h1 className="font-heading text-2xl font-extrabold sm:text-4xl">{dict.heroTitle}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/90 sm:text-base">{dict.heroSubtitle}</p>
      </div>
      {articles.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-2 p-10 text-center">
          <FlamingoMascot className="h-14 w-14 opacity-70" />
          <p className="font-heading font-bold text-gray-900">{dict.firstArticleSoon}</p>
        </div>
      ) : (
        <>
          <RecommendedArticles
            articles={articles.map((a) => ({
              slug: a.slug,
              title: a.title,
              destination: a.destination,
              coverImageUrl: a.coverImageUrl,
              scores: a.scores,
            }))}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/enciclopedia/${article.slug}`}
                className="tap-scale card-surface overflow-hidden hover:border-brand-200"
              >
                <div className="relative h-40 w-full bg-gradient-to-br from-brand-100 to-lagoon-100">
                  {article.coverImageUrl ? (
                    <Image
                      src={article.coverImageUrl}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 640px) 400px, 100vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-12 w-12" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                    📍 {article.destination}
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="font-heading font-bold text-gray-900">{article.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{article.seo?.metaDescription}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {topInterests(article.scores, 2).map((key) => (
                      <li
                        key={key}
                        className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700"
                      >
                        <span aria-hidden>{INTEREST_ICONS[key]}</span>
                        {INTEREST_LABELS[key]}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
