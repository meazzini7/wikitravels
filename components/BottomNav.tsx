"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/i18n-context";

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition ${
          active ? "bg-brand-100 text-brand-700" : "text-gray-400"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className={active ? "text-brand-700" : "text-gray-400"}>{label}</span>
    </Link>
  );
}

// Solo le 4 sezioni più usate: il resto (Enciclopedia, Chat, Notifiche,
// Crea viaggio) sta nel menu hamburger in alto, per non affollare questa
// barra fissa su schermi piccoli.
export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("bottomNav");

  if (!user) return null;

  const items = [
    { href: "/", label: t("home"), icon: "🏠" },
    { href: "/feed", label: t("feed"), icon: "🧭" },
    { href: "/classifica", label: t("leaderboard"), icon: "🏆" },
    { href: "/profilo", label: t("profile"), icon: "👤" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[68px] items-stretch border-t border-brand-100 bg-white/95 backdrop-blur-md sm:hidden">
      {items.map((item) => (
        <NavItem key={item.href} {...item} active={pathname === item.href} />
      ))}
    </nav>
  );
}
