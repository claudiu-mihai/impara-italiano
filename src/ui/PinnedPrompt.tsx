import type { ReactNode } from "react";

/**
 * Cardul cu cerința unui exercițiu cu text: dacă zona vizibilă (cu tastatura deschisă) e prea mică și ecranul
 * derulează, cardul rămâne lipit sus, nu iese din ecran odată cu antetul.
 */
export function PinnedPrompt({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sticky top-0 z-10 -mb-4 bg-slate-50 pb-4 dark:bg-slate-950 ${className}`}>{children}</div>
  );
}
