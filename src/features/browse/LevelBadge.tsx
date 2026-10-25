import { useT } from "../../i18n/index.ts";
import { LEVEL_LABEL } from "../../domain/content/display.ts";
import type { Mastery } from "../../domain/srs/mastery.ts";

const STYLE: Record<Mastery, string> = {
  new: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  learning: "bg-amber-100 text-amber-900",
  mastered: "bg-green-100 text-green-900",
};

export function LevelBadge({ level }: { level: Mastery }) {
  const { t } = useT();
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[level]}`}>{t(LEVEL_LABEL[level])}</span>;
}
