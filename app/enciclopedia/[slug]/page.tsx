import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAdminDb } from "@/lib/firebase-admin";
import { getLocalizedArticle } from "@/lib/server/get-localized-article";
import { getArticleCards } from "@/lib/server/article-list";
import { enhanceArticleHtml, jsonLdString, pickRelated } from "@/lib/article-html";
import { getSiteUrl } from "@/lib/site-url";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import ShareButtons from "@/components/ShareButtons";
import FlamingoMascot from "@/components/FlamingoMascot";
import { INTEREST_ICONS, INTEREST_LABELS, topInterests } from "@/lib/interests";

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
  const locale = getServerLocale();
  const article = await getLocalizedArticle(params.slug, locale);
  if (!article) return {};
  const title = article.displayMetaTitle;
  const description = article.displayMetaDescription;
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
  if (typeof value === "string") return value;
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

function formatDate(iso: string | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(date);
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const locale = getServerLocale();
  const dict = getDictionary(locale).enciclopedia;
  const article = await getLocalizedArticle(params.slug, locale);
  if (!article) notFound();

  const relatedArticles = pickRelated(await getArticleCards(), article);
  const publishedDate = toIsoDate(article.createdAt);
  // Gli articoli rinnovati (vedi scripts/rewrite-article.ts) hanno una data
  // di aggiornamento distinta da quella di prima pubblicazione.
  const updatedDate = toIsoDate(article.rewrittenAt) ?? publishedDate;
  const publishedLabel = formatDate(publishedDate, locale);
  const updatedLabel = formatDate(updatedDate, locale);
  const { html: contentHtml, toc, faq } = enhanceArticleHtml(article.displayContentHtml);
  const siteUrl = getSiteUrl();
  const articleUrl = `${siteUrl}/enciclopedia/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.displayTitle,
    description: article.displayMetaDescription,
    image: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    datePublished: publishedDate,
    dateModified: updatedDate,
    inLanguage: locale,
    author: { "@type": "Organization", name: "WikiTravels" },
    publisher: { "@type": "Organization", name: "WikiTravels" },
    mainEntityOfPage: `${siteUrl}/enciclopedia/${article.slug}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "WikiTravels", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Enciclopedia", item: `${siteUrl}/enciclopedia` },
      { "@type": "ListItem", position: 3, name: article.displayTitle, item: articleUrl },
    ],
  };

  // Le domande frequenti presenti nel testo, descritte anche a Google.
  const faqJsonLd =
    faq.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }} />
      )}
      {article.coverImageUrl && (
        <div className="relative mb-6 h-64 w-full overflow-hidden rounded-3xl shadow-soft sm:h-80">
          <Image
            src={article.coverImageUrl}
            alt={article.displayTitle}
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
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-gray-900 sm:text-3xl">{article.displayTitle}</h1>

      <p className="mb-3 text-xs text-gray-500">
        {dict.byline}
        {publishedLabel && (
          <>
            {" · "}
            {dict.published} <time dateTime={publishedDate}>{publishedLabel}</time>
          </>
        )}
        {updatedLabel && updatedLabel !== publishedLabel && (
          <>
            {" · "}
            {dict.updated} <time dateTime={updatedDate}>{updatedLabel}</time>
          </>
        )}
        {" · "}
        <Link href="/chi-siamo" className="font-semibold text-brand-600 underline">
          {dict.howWeWrite}
        </Link>
      </p>

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

      {article.isMachineTranslated && (
        <p className="mb-4 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">🌐 {dict.translatingNotice}</p>
      )}

      <div className="mb-6">
        <ShareButtons url={articleUrl} title={article.displayTitle} />
      </div>

      {toc.length >= 4 && (
        <nav aria-label={dict.tocTitle} className="card-surface mb-6 p-4 sm:p-5">
          <p className="mb-2 font-heading text-sm font-bold text-gray-900">{dict.tocTitle}</p>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-brand-700 hover:underline">
                  {item.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="article-body card-surface prose prose-brand max-w-none p-5 sm:p-8"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {/* Nessun riquadro pubblicitario fisso: dopo l'approvazione gli annunci
          li posiziona AdSense ("annunci automatici") grazie al codice
          nell'<head> (vedi app/layout.tsx). */}

      {article.coverImageCredit && (
        <p className="mb-8 text-xs text-gray-500">
          {dict.photoBy}{" "}
          <a
            href={article.coverImageCredit.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {article.coverImageCredit.author}
          </a>{" "}
          {dict.onUnsplash}
        </p>
      )}

      {relatedArticles.length > 0 && (
        <section>
          <h2 className="mb-4 font-heading text-lg font-bold text-gray-900">{dict.relatedTitle}</h2>
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
