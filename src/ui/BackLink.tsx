import { Link } from "react-router-dom";
import { useT } from "../i18n/index.ts";

interface BackLinkProps {
  to: string;
  /** Numele paginii la care se întoarce, ex. „Teme”. Cititorii de ecran aud „Înapoi la Teme”. */
  label: string;
}

/**
 * Linkul de întoarcere de la începutul unei pagini: pastilă cu o săgeată desenată (nu caracterul „←”, care arată diferit
 * de la un sistem la altul), zonă de atingere de minim 48 px și o mică animație la apăsare.
 */
export function BackLink({ to, label }: BackLinkProps) {
  const { t } = useT();
  return (
    <Link
      to={to}
      aria-label={t("common.backTo", { label })}
      className="group inline-flex min-h-12 w-fit items-center gap-1 rounded-full border border-slate-200 bg-white py-2 pl-2.5 pr-4 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-95 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:active:bg-slate-800"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5 text-brand-fg transition-transform group-active:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}
