import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import OnboardingGuard from "@/components/OnboardingGuard";
import { getSiteUrl } from "@/lib/site-url";

const heading = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const siteUrl = getSiteUrl();

const description =
  "WikiTravels è il portale social per viaggiatori: organizza viaggi, connettiti con altri esploratori e scopri la nostra enciclopedia di destinazioni.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WikiTravels — il portale social per viaggiatori",
    template: "%s | WikiTravels",
  },
  description,
  keywords: [
    "viaggi",
    "social viaggiatori",
    "organizzare un viaggio",
    "diario di viaggio online",
    "community di viaggiatori",
    "enciclopedia dei viaggi",
    "destinazioni di viaggio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "WikiTravels",
    title: "WikiTravels — il portale social per viaggiatori",
    description,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "WikiTravels — il portale social per viaggiatori",
    description,
  },
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getServerLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale} className={`${heading.variable} ${body.variable}`}>
      <head>
        {/* Avvia in anticipo la connessione (DNS + TLS) verso i domini
            esterni usati da quasi ogni pagina, così Firestore/Auth/le
            immagini di copertina non pagano quel tempo in più al primo
            utilizzo: è una delle cause più concrete di "lentezza percepita"
            in un'app che dipende tanto da chiamate esterne come questa. */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
      </head>
      <body>
        <GoogleAnalytics />
        <I18nProvider locale={locale} dictionary={dictionary}>
          <AuthProvider>
            <OnboardingGuard />
            <Navbar />
            <div className="pb-20 sm:pb-0">{children}</div>
            <BottomNav />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
