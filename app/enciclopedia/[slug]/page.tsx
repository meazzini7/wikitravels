import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
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

  const publishedDate = toIsoDate(article.createdAt);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {article.coverImageUrl && (
        <div className="relative mb-6 h-64 w-full overflow-hidden rounded-lg">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes="768px"
            priority
          />
        </div>
      )}
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{article.title}</h1>
      <p className="mb-6 text-sm text-gray-500">{article.destination}</p>

      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="prose prose-brand max-w-none"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      {/* Slot pubblicitario predisposto (Google AdSense) */}
      <div className="my-8 flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
        Spazio pubblicitario
      </div>

      {article.coverImageCredit && (
        <p className="text-xs text-gray-400">
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
    </main>
  );
}
