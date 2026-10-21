import type { Level } from "../domain/content/constants.ts";
import { LEVEL_NAME } from "../domain/content/levels.ts";

/** Insigna nivelului CEFR (A1–C2); numele complet este disponibil ca tooltip și pentru cititoare de ecran. */
export function CefrBadge({ level }: { level: Level }) {
  return (
    <span
      title={`${level} · ${LEVEL_NAME[level]} (estimat)`}
      className="rounded border border-brand-fg px-1.5 py-0.5 text-xs font-bold text-brand-fg"
    >
      {level}
    </span>
  );
}
