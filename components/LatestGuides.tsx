import Link from "next/link";
import Image from "next/image";
import FlamingoMascot from "@/components/FlamingoMascot";
import { getArticleCards } from "@/lib/server/article-list";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

// Le ultime guide dell'Enciclopedia nella home: componente server, quindi il
// contenuto è già nell'HTML della pagina (visibile a chi non è registrato e
// ai motori di ricerca) e non dipende da chiamate fatte dal browser. Usa la
// lingua predefinita come il resto del guscio statico (vedi app/layout.tsx).
export default async function LatestGuides() {
  const guides = (await getArticleCards()).slice(0, 6);
  if (guides.length === 0) return null;
  const dict = getDictionary(DEFAULT_LOCALE).enciclopedia;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold text-gray-900">{dict.latestGuidesTitle}</h2>
        <Link href="/enciclopedia" className="shrink-0 text-sm font-bold text-brand-700">
          {dict.allGuides}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/enciclopedia/${guide.slug}`}
            className="tap-scale card-surface flex overflow-hidden hover:border-brand-200 sm:block"
          >
            <div className="relative h-auto w-28 shrink-0 bg-gradient-to-br from-brand-100 to-lagoon-100 sm:h-32 sm:w-full">
              {guide.coverImageUrl ? (
                <Image
                  src={guide.coverImageUrl}
                  alt={guide.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 640px) 300px, 112px"
                />
              ) : (
                <div className="flex h-full min-h-[96px] w-full items-center justify-center text-brand-300">
                  <FlamingoMascot className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="min-w-0 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">📍 {guide.destination}</p>
              <h3 className="line-clamp-2 font-heading text-sm font-bold text-gray-900">{guide.title}</h3>
              {guide.description && <p className="mt-1 line-clamp-2 text-xs text-gray-600">{guide.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
