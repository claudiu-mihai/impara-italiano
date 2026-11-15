import { useLiveQuery } from "dexie-react-hooks";
import type { Grade } from "ts-fsrs";
import { db } from "../data/db/instance.ts";
import { Rating } from "../domain/srs/fsrsConstants.ts";
import type { RatingMode } from "../domain/settings.ts";
import { useT, type Key } from "../i18n/index.ts";

interface ButtonSpec {
  grade: Grade;
  label: Key;
  /** Sensul notei, scurt („am uitat”); lipsește în modul simplu, unde întrebarea „Ți-ai amintit?” e destul. */
  meaning?: Key;
  color: string;
}

// Două butoane: FSRS funcționează corect doar cu „Din nou” și „Bine”, iar decizia e una singură: ți-ai amintit sau nu.
const SIMPLE: ButtonSpec[] = [
  { grade: Rating.Again, label: "rate.no", color: "bg-red-700" },
  { grade: Rating.Good, label: "rate.yes", color: "bg-brand" },
];

// Toate cele patru note, pe un rând, de la rău (stânga) la bine (dreapta), ca la swipe; etichete de același fel.
const FULL: ButtonSpec[] = [
  { grade: Rating.Again, label: "rate.no", meaning: "rate.noMeaning", color: "bg-red-700" },
  { grade: Rating.Hard, label: "rate.hard", meaning: "rate.hardMeaning", color: "bg-amber-700" },
  { grade: Rating.Good, label: "rate.yes", meaning: "rate.yesMeaning", color: "bg-brand" },
  { grade: Rating.Easy, label: "rate.easy", meaning: "rate.easyMeaning", color: "bg-sky-700" },
];

/** Îndemnul la sinceritate apare doar până la atâtea repetiții în total, apoi doar ocupă loc. */
export const HINT_UNTIL_REVIEWS = 10;

/** Arată îndemnul la sinceritate? (doar la început; `false` cât se citește jurnalul). */
export function useRatingHint(): boolean {
  const count = useLiveQuery(() => db.reviewLog.count(), []);
  return count !== undefined && count < HINT_UNTIL_REVIEWS;
}

/** Notele disponibile într-un mod, în ordinea tastelor 1, 2, … */
export function ratingGrades(mode: RatingMode): Grade[] {
  return (mode === "simple" ? SIMPLE : FULL).map((b) => b.grade);
}

interface RatingButtonsProps {
  mode: RatingMode;
  /** Întrebarea, ca nume al grupului („Cât de bine ai știut cuvântul?”). */
  question: string;
  /** Peste cât revine cardul la fiecare notă (ex. „10 min”, „4 zile”); `undefined` cât se calculează. */
  intervals: Record<Grade, string> | undefined;
  onRate: (grade: Grade) => void;
  disabled?: boolean;
  /** Îndemnul la sinceritate, doar la început (primele repetiții). */
  showHint?: boolean;
}

/**
 * Butoanele de autoevaluare. Simplu (implicit la instalări noi): „Ți-ai amintit?” cu Nu / Da, mari. Complet: cele patru
 * note FSRS pe un rând, fiecare cu un sens scurt. Fiecare buton spune când revine cardul.
 */
export function RatingButtons({ mode, question, intervals, onRate, disabled = false, showHint = false }: RatingButtonsProps) {
  const { t } = useT();
  const simple = mode === "simple";
  return (
    <div className="flex flex-col gap-2">
      {showHint && <p className="text-center text-sm text-muted">{t("rate.hint")}</p>}
      {simple && <p className="text-center text-lg font-semibold">{t("rate.remembered")}</p>}
      <div className={`grid gap-2 ${simple ? "grid-cols-2" : "grid-cols-4"}`} role="group" aria-label={question}>
        {(simple ? SIMPLE : FULL).map(({ grade, label, meaning, color }) => (
          <button
            key={grade}
            type="button"
            disabled={disabled}
            onClick={() => onRate(grade)}
            className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-center text-white disabled:opacity-50 ${color} ${
              simple ? "min-h-20" : "min-h-16"
            }`}
          >
            <span className={`font-semibold ${simple ? "text-xl" : ""}`}>
              {simple && <span aria-hidden="true">{grade === Rating.Again ? "✗ " : "✓ "}</span>}
              {t(label)}
            </span>
            {meaning && <span className="text-xs leading-tight">{t(meaning)}</span>}
            <span className={`leading-tight ${simple ? "text-sm" : "text-[11px]"}`}>
              {intervals ? (simple ? t("rate.next", { when: intervals[grade] }) : intervals[grade]) : "…"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
