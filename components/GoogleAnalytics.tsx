"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// ID di misurazione GA4 (non è un dato segreto: appare comunque in chiaro
// nel codice sorgente di qualsiasi pagina che lo usa).
const GA_MEASUREMENT_ID = "G-79RD9HZ0Z9";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  // Le pagine /admin non vanno tracciate: le visite del proprietario
  // sporcherebbero le statistiche e il segreto presente nell'indirizzo
  // (?secret=...) verrebbe registrato nei report di Analytics.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
