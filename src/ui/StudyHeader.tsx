import { Link } from "react-router-dom";
import { useT } from "../i18n/index.ts";
import { useReturnToOrigin } from "./useReturnToOrigin.ts";

interface StudyHeaderProps {
  index: number;
  total: number;
  label?: string;
  /** Unde duce ✕ (implicit lista „Învață”). */
  exitTo?: string;
  /** Starea de navigare transmisă odată cu ieșirea (react-router `state`). */
  exitState?: unknown;
  /** ✕ te întoarce la pagina de unde ai pornit (vezi `useReturnToOrigin`); `exitTo` rămâne pentru sesiunile deschise direct. */
  returnToOrigin?: boolean;
}

/** Antetul comun al sesiunilor de studiu: ieșire, bară de progres și contor. */
export function StudyHeader({ index, total, label, exitTo = "/learn", exitState, returnToOrigin = false }: StudyHeaderProps) {
  const { t } = useT();
  const onExit = useReturnToOrigin(returnToOrigin);
  return (
    <header className="flex items-center gap-3">
      <Link to={exitTo} state={exitState} onClick={onExit} aria-label={t("study.exit")} className="flex size-12 items-center justify-center text-2xl">
        ✕
      </Link>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-label={label ?? t("study.progress")}
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      >
        <div
          className="h-full bg-brand transition-[width]"
          style={{ width: `${total ? (index / total) * 100 : 0}%` }}
        />
      </div>
      <span className="w-14 text-right text-sm text-muted">
        {Math.min(index + 1, total)} / {total}
      </span>
    </header>
  );
}
