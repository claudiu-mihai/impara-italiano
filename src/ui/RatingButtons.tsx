import type { Grade } from "ts-fsrs";
import { Rating } from "../domain/srs/fsrsConstants.ts";
import { useT, type Key } from "../i18n/index.ts";

const BUTTONS: { grade: Grade; label: Key; meaning: Key; color: string }[] = [
  { grade: Rating.Again, label: "rate.again", meaning: "rate.againMeaning", color: "bg-red-700" },
  { grade: Rating.Hard, label: "rate.hard", meaning: "rate.hardMeaning", color: "bg-amber-700" },
  { grade: Rating.Good, label: "rate.good", meaning: "rate.goodMeaning", color: "bg-brand" },
  { grade: Rating.Easy, label: "rate.easy", meaning: "rate.easyMeaning", color: "bg-sky-700" },
];

interface RatingButtonsProps {
  /** Întrebarea, ca nume al grupului („Cât de bine ai știut cuvântul?”). */
  question: string;
  /** Peste cât revine cardul la fiecare notă (ex. „10 min”, „4 zile”); `undefined` cât se calculează. */
  intervals: Record<Grade, string> | undefined;
  onRate: (grade: Grade) => void;
  disabled?: boolean;
}

/**
 * Cele 4 note FSRS, explicate: fiecare buton spune ce înseamnă („Nu mi-am amintit”) și când revine cardul, iar deasupra
 * un îndemn la sinceritate, pentru cei care nu știu ce aleg.
 */
export function RatingButtons({ question, intervals, onRate, disabled = false }: RatingButtonsProps) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-sm text-muted">{t("rate.hint")}</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={question}>
        {BUTTONS.map(({ grade, label, meaning, color }) => (
          <button
            key={grade}
            type="button"
            disabled={disabled}
            onClick={() => onRate(grade)}
            className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-2 py-1 text-center text-white disabled:opacity-50 ${color}`}
          >
            <span className="font-semibold">{t(label)}</span>
            <span className="text-xs">{t(meaning)}</span>
            <span className="text-xs">{intervals ? t("rate.next", { when: intervals[grade] }) : "…"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
