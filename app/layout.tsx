import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  return (
    <html lang="it" className={`${heading.variable} ${body.variable}`}>
      <body>
        <GoogleAnalytics />
        <AuthProvider>
          <Navbar />
          <div className="pb-20 sm:pb-0">{children}</div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
