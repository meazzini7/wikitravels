"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/feed", label: "Feed", icon: "🧭" },
  { href: "/viaggi", label: "Viaggi", icon: "🧳" },
  { href: "/notifiche", label: "Notifiche", icon: "🔔" },
  { href: "/classifica", label: "Classifica", icon: "🏆" },
];

export default function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex h-16 border-t border-gray-100 bg-white/95 backdrop-blur sm:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              active ? "text-brand-700" : "text-gray-500"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
