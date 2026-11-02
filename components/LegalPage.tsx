import { LEGAL_UPDATED } from "@/lib/site-info";

// Contenitore comune delle pagine informative (chi siamo, privacy, cookie...).
export default function LegalPage({
  title,
  intro,
  showUpdated = true,
  children,
}: {
  title: string;
  intro?: string;
  showUpdated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="font-heading text-2xl font-extrabold text-gray-900 sm:text-3xl">{title}</h1>
      {intro && <p className="mt-2 text-gray-600">{intro}</p>}
      {showUpdated && <p className="mt-1 text-xs text-gray-400">Ultimo aggiornamento: {LEGAL_UPDATED}</p>}
      <div className="card-surface prose prose-brand mt-6 max-w-none p-5 sm:p-8">{children}</div>
    </main>
  );
}
