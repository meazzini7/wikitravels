"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { computeMatchScore } from "@/lib/travel-utils";
import { INTEREST_ICONS, topInterests } from "@/lib/interests";
import type { InterestScores } from "@/lib/interests";
import FlamingoMascot from "@/components/FlamingoMascot";

export interface RecommendableArticle {
  slug: string;
  title: string;
  destination: string;
  coverImageUrl: string | null;
  scores: InterestScores;
}

interface RecommendedArticlesProps {
  articles: RecommendableArticle[];
}

const MIN_MATCH_PERCENT = 55;

// Confronta gli interessi salvati nel profilo con i punteggi di ogni
// articolo (già assegnati dall'AI in fase di generazione) per proporre in
// cima gli articoli più in tema con chi sta guardando, invece di un
// semplice ordine cronologico uguale per tutti.
export default function RecommendedArticles({ articles }: RecommendedArticlesProps) {
  const { profile } = useAuth();

  const recommended = useMemo(() => {
    if (!profile) return [];
    return articles
      .map((article) => ({ article, score: computeMatchScore(profile.interests, article.scores) }))
      .filter((m) => m.score >= MIN_MATCH_PERCENT)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [articles, profile]);

  if (recommended.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-heading text-lg font-bold text-gray-900">🎯 Consigliati per te</h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {recommended.map(({ article, score }) => (
          <li key={article.slug} className="w-40 shrink-0">
            <Link
              href={`/enciclopedia/${article.slug}`}
              className="tap-scale card-surface block overflow-hidden hover:border-brand-200"
            >
              <div className="relative h-24 w-full bg-gradient-to-br from-brand-100 to-lagoon-100">
                {article.coverImageUrl ? (
                  <Image src={article.coverImageUrl} alt={article.title} fill className="object-cover" sizes="160px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-300">
                    <FlamingoMascot className="h-8 w-8" />
                  </div>
                )}
                <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                  {score}%
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">{article.destination}</p>
                <h3 className="truncate text-sm font-bold text-gray-900">{article.title}</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {topInterests(article.scores, 1)
                    .map((k) => INTEREST_ICONS[k])
                    .join(" ")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
