import type { Metadata } from "next";
import HomePageContent from "@/components/HomePageContent";
import LatestGuides from "@/components/LatestGuides";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

// La home mostra le ultime guide: si rigenera da sola ogni 6 ore e subito
// quando esce o viene rinnovato un articolo (revalidatePath("/") nei cron).
export const revalidate = 21600;

export const metadata: Metadata = {
  title: "WikiTravels — organizza viaggi, segui altri esploratori, scopri il mondo",
  description:
    "Crea il tuo viaggio a bottoni, scopri quelli della community, sfida gli amici a km percorsi e leggi la nostra enciclopedia di destinazioni aggiornata ogni giorno.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WikiTravels",
    url: siteUrl,
    description:
      "Il portale social per viaggiatori: organizza viaggi, connettiti con altri esploratori e scopri la nostra enciclopedia di destinazioni.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/enciclopedia?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomePageContent guides={<LatestGuides />} />
    </>
  );
}
