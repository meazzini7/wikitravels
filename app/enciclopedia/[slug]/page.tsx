import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
import ShareButtons from "@/components/ShareButtons";
import FlamingoMascot from "@/components/FlamingoMascot";
import { INTEREST_ICONS, INTEREST_LABELS, topInterests } from "@/lib/interests";
import type { Article } from "@/lib/types";

export const revalidate = 3600;

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const snap = await getAdminDb().collection("articles").doc(slug).get();
    if (!snap.exists) return null;
    return snap.data() as Article;
  } catch (err) {
    console.error("Impossibile caricare l'articolo:", err);
    return null;
  }
}

async function getRelatedArticles(currentSlug: string): Promise<Article[]> {
  try {
    const snap = await getAdminDb()
      .collection("articles")
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .limit(7)
      .get();
    return snap.docs
      .map((d) => d.data() as Article)
      .filter((a) => a.slug !== currentSlug)
      .slice(0, 3);
  } catch (err) {
    console.error("Impossibile caricare gli articoli correlati:", err);
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const snap = await getAdminDb()
      .collection("articles")
      .where("status", "==", "published")
      .select()
      .get();
    return snap.docs.map((d) => ({ slug: d.id }));
  } catch (err) {
    console.error("Impossibile generare gli slug statici dell'enciclopedia:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return {};
  const title = article.seo?.metaTitle ?? article.title;
  const description = article.seo?.metaDescription;
  return {
    title,
    description,
    alternates: { canonical: `/enciclopedia/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  };
}

function toIsoDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const relatedArticles = await getRelatedArticles(article.slug);
  const publishedDate = toIsoDate(article.createdAt);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const articleUrl = `${siteUrl}/enciclopedia/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seo?.metaDescription,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: publishedDate,
    author: { "@type": "Organization", name: "WikiTravels" },
    publisher: { "@type": "Organization", name: "WikiTravels" },
    mainEntityOfPage: `${siteUrl}/enciclopedia/${article.slug}`,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {article.coverImageUrl && (
        <div className="relative mb-6 h-64 w-full overflow-hidden rounded-3xl shadow-soft sm:h-80">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes="768px"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-700">
            📍 {article.destination}
          </span>
        </div>
      )}
      <h1 className="mb-3 font-heading text-2xl font-extrabold text-gray-900 sm:text-3xl">{article.title}</h1>

      <ul className="mb-4 flex flex-wrap gap-1.5">
        {topInterests(article.scores, 3).map((key) => (
          <li
            key={key}
            className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700"
          >
            <span aria-hidden>{INTEREST_ICONS[key]}</span>
            {INTEREST_LABELS[key]}
          </li>
        ))}
      </ul>

      <div className="mb-6">
        <ShareButtons url={articleUrl} title={article.title} />
      </div>

      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="card-surface prose prose-brand max-w-none p-5 sm:p-8"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      {/* Slot pubblicitario predisposto (Google AdSense) */}
      <div className="my-8 flex min-h-[100px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-xs text-gray-400">
        Spazio pubblicitario
      </div>

      {article.coverImageCredit && (
        <p className="mb-8 text-xs text-gray-500">
          Foto di{" "}
          <a
            href={article.coverImageCredit.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {article.coverImageCredit.author}
          </a>{" "}
          su Unsplash
        </p>
      )}

      {relatedArticles.length > 0 && (
        <section>
          <h2 className="mb-4 font-heading text-lg font-bold text-gray-900">📚 Articoli correlati</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/enciclopedia/${related.slug}`}
                className="tap-scale card-surface overflow-hidden hover:border-brand-200"
              >
                <div className="relative h-24 w-full bg-gradient-to-br from-brand-100 to-lagoon-100">
                  {related.coverImageUrl ? (
                    <Image src={related.coverImageUrl} alt={related.title} fill className="object-cover" sizes="300px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-300">
                      <FlamingoMascot className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">{related.destination}</p>
                  <h3 className="truncate font-heading text-sm font-bold text-gray-900">{related.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
