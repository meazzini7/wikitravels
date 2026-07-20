import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

// Banner sfumato riutilizzato in cima alle pagine principali (feed, viaggi,
// classifica...) al posto di un semplice <h1> su sfondo bianco.
export default function PageHero({ eyebrow, title, subtitle, children, className }: PageHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-lagoon-500 px-5 py-7 text-white shadow-pop sm:px-8 sm:py-9 ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10" />
      <div className="relative">
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/80">{eyebrow}</p>
        )}
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-white/90 sm:text-base">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
