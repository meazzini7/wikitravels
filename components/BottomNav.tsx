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

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("bottomNav");

  if (!user) return null;

  const leftItems = [
    { href: "/", label: t("home"), icon: "🏠" },
    { href: "/feed", label: t("feed"), icon: "🧭" },
  ];
  const rightItems = [
    { href: "/notifiche", label: t("notifications"), icon: "🔔" },
    { href: "/classifica", label: t("leaderboard"), icon: "🏆" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[68px] items-stretch border-t border-brand-100 bg-white/95 backdrop-blur-md sm:hidden">
      {leftItems.map((item) => (
        <NavItem key={item.href} {...item} active={pathname === item.href} />
      ))}

      <div className="relative w-16 shrink-0">
        <Link
          href="/viaggi/nuovo"
          aria-label={t("createTrip")}
          className="tap-scale absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-2xl text-white shadow-pop"
        >
          ✚
        </Link>
        <Link
          href="/viaggi"
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-gray-400"
        >
          {t("trips")}
        </Link>
      </div>

      {rightItems.map((item) => (
        <NavItem key={item.href} {...item} active={pathname === item.href} />
      ))}
    </nav>
  );
}
