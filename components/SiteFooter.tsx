import Link from "next/link";
import { SITE_NAME } from "@/lib/site-info";
import CookieSettingsButton from "./CookieSettingsButton";

const LINKS = [
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/come-scriviamo-gli-articoli", label: "Come scriviamo gli articoli" },
  { href: "/contatti", label: "Contatti" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookie", label: "Cookie" },
];

// Footer comune a tutte le pagine: i link alle pagine di trasparenza devono
// essere raggiungibili da ogni punto del sito.
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-brand-100 px-4 py-6 text-center text-xs text-gray-500">
      <nav aria-label="Informazioni sul sito" className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="font-semibold text-gray-600 hover:text-brand-600">
            {link.label}
          </Link>
        ))}
        <CookieSettingsButton />
      </nav>
      <p>© {new Date().getFullYear()} {SITE_NAME}</p>
    </footer>
  );
}
