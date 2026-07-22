import Script from "next/script";

// ID di misurazione GA4 (non è un dato segreto: appare comunque in chiaro
// nel codice sorgente di qualsiasi pagina che lo usa).
const GA_MEASUREMENT_ID = "G-79RD9HZ0Z9";

export default function GoogleAnalytics() {
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
