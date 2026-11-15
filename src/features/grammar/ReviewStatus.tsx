import { isDue } from "../../domain/session/buildDailySession.ts";
import { formatInterval } from "../../domain/srs/format.ts";
import type { StoredCard } from "../../domain/srs/types.ts";
import { endOfStudyDay } from "../../domain/time/studyDay.ts";
import { useT } from "../../i18n/index.ts";

/**
 * Starea repetiției unei lecții: „De repetat” (scadentă), „Următoarea repetiție: peste 5 zile” sau, pe pagina lecției,
 * cum intră lecția în repetiție. În listă, o lecție fără card nu arată nimic.
 */
export function ReviewStatus({
  card,
  compact = false,
  start,
  testId = "grammar-review",
}: {
  card: StoredCard | undefined;
  compact?: boolean;
  /** Textul pentru un element fără card (implicit cel al lecțiilor de gramatică). */
  start?: string;
  testId?: string;
}) {
  const { t, tp } = useT();
  const now = new Date();
  if (!card) {
    return compact ? null : <p className="text-sm text-muted" data-testid={testId}>{start ?? t("grammar.reviewStart")}</p>;
  }
  if (isDue(card, now, endOfStudyDay(now))) {
    return (
      <span
        data-testid={testId}
        className={`w-fit rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-950 ${compact ? "text-xs" : "text-sm"}`}
      >
        {t("grammar.due")}
      </span>
    );
  }
  return (
    <span data-testid={testId} className={`block text-muted ${compact ? "text-xs" : "text-sm"}`}>
      {t("grammar.nextReview", { when: formatInterval(card.due, now, tp) })}
    </span>
  );
}
