import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SessionDoneProps {
  emoji?: string;
  title: string;
  text: string;
  children?: ReactNode;
  /** Destinația linkului de întoarcere (implicit lista „Învață”). */
  backTo?: string;
  backLabel?: string;
}

export const primaryButton =
  "flex min-h-14 items-center justify-center rounded-xl bg-brand px-8 text-lg font-semibold text-white active:bg-brand-dark";

/** Ecranul de final al unei sesiuni (sau „nimic de făcut”). */
export function SessionDone({
  emoji = "🎉",
  title,
  text,
  children,
  backTo = "/learn",
  backLabel = "Înapoi la învățare",
}: SessionDoneProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl" aria-hidden="true">
        {emoji}
      </p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">{text}</p>
      <div className="flex flex-col gap-3">
        {children}
        <Link to={backTo} className="flex min-h-12 items-center justify-center text-brand-fg underline">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
