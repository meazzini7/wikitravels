import type { ReactNode } from "react";
import FlamingoMascot from "@/components/FlamingoMascot";

interface EmptyStateProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-10 text-center">
      <FlamingoMascot className="h-16 w-16 opacity-80" />
      <p className="font-heading text-lg font-bold text-gray-900">{title}</p>
      {description && <p className="max-w-xs text-sm text-gray-500">{description}</p>}
      {children}
    </div>
  );
}
