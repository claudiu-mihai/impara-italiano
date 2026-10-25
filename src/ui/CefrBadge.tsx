import type { Level } from "../domain/content/constants.ts";
import { useT } from "../i18n/index.ts";

/** Insigna nivelului CEFR (A1–C2); numele complet este disponibil ca tooltip și pentru cititoare de ecran. */
export function CefrBadge({ level }: { level: Level }) {
  const { t } = useT();
  return (
    <span
      title={t("cefr.tooltip", { level, name: t(`level.${level}`) })}
      className="rounded border border-brand-fg px-1.5 py-0.5 text-xs font-bold text-brand-fg"
    >
      {level}
    </span>
  );
}
