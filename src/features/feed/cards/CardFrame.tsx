import type { ReactNode } from "react";

/** Machetul comun al cardurilor: etichetă sus, conținutul centrat pe verticală, derulabil dacă nu încape. */
export function CardFrame({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
      {label && <span className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</span>}
      {children}
    </div>
  );
}
