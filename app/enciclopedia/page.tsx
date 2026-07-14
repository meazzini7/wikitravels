import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Enciclopedia dei viaggi</h1>
      <p className="mb-8 text-gray-600">
        Guide di destinazioni generate e aggiornate ogni giorno, per ispirare il tuo prossimo viaggio.
      </p>
      {articles.length === 0 ? (
        <p className="text-gray-500">Il primo articolo arriva a breve.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/enciclopedia/${article.slug}`}
              className="block overflow-hidden rounded-lg border border-gray-100 hover:border-brand-200"
            >
              <div className="relative h-40 w-full bg-brand-50">
                {article.coverImageUrl && (
                  <Image
                    src={article.coverImageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 640px) 400px, 100vw"
                  />
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-gray-900">{article.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{article.seo?.metaDescription}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
