import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WikiTravels",
    template: "%s | WikiTravels",
  },
  description:
    "WikiTravels è il portale social per viaggiatori: organizza viaggi, connettiti con altri esploratori e scopri la nostra enciclopedia di destinazioni.",
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
    <html lang="it">
      <body>
        <AuthProvider>
          <Navbar />
          <div className="pb-16 sm:pb-0">{children}</div>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
