import { useT } from "../../i18n/index.ts";
import { splitAtGap } from "../../domain/grammar/gap.ts";

interface GapTextProps {
  it: string;
  gap: string;
  /** Dacă este dat, lacuna arată acest text (răspunsul); altfel o linie goală. */
  filled?: string;
  tone?: "neutral" | "correct" | "wrong";
}

const TONE = {
  neutral: "border-brand text-brand-fg",
  correct: "border-green-600 text-green-700 dark:text-green-400",
  wrong: "border-red-600 text-red-700 dark:text-red-400",
} as const;

/** Expresia italiană cu lacuna evidențiată: „___ libro” sau, cu răspunsul, „il libro”. */
export function GapText({ it, gap, filled, tone = "neutral" }: GapTextProps) {
  const { t } = useT();
  const parts = splitAtGap(it, gap);
  if (!parts) return <>{it}</>;
  return (
    <>
      {parts.before}
      <span className={`inline-block min-w-[2ch] border-b-4 px-1 ${TONE[tone]}`}>
        {filled ?? <span aria-label={t("gap.label")}>&nbsp;&nbsp;&nbsp;</span>}
      </span>
      {parts.after}
    </>
  );
}
