import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lupino, type LupinoPose } from "./mascot/Lupino.tsx";

interface SessionDoneProps {
  /** Un emoji în locul lui Lupino (pentru ecranele de eroare sau „nimic de făcut”). */
  emoji?: string;
  /** Ipostaza lui Lupino când nu e dat un emoji; implicit „bravo”. */
  mascot?: LupinoPose;
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
  emoji,
  mascot = "bravo",
  title,
  text,
  children,
  backTo = "/learn",
  backLabel = "Înapoi la învățare",
}: SessionDoneProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      {emoji ? (
        <p className="text-5xl" aria-hidden="true">
          {emoji}
        </p>
      ) : (
        <Lupino pose={mascot} size={160} />
      )}
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
