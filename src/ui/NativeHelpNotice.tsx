import { useLiveQuery } from "dexie-react-hooks";
import type { Level } from "../domain/content/constants.ts";
import { db } from "../data/db/instance.ts";
import { useT } from "../i18n/index.ts";
import { NATIVE_HELP_STOPPED } from "../data/db/repositories.ts";

/** Mesajul care apare o dată, după ce traducerea în limba maternă s-a oprit singură la trecerea peste nivelul A. */
export function NativeHelpNotice({ inSettings = false }: { inSettings?: boolean }) {
  const { t } = useT();
  const level = useLiveQuery(async () => (await db.meta.get(NATIVE_HELP_STOPPED))?.value as Level | undefined, []);
  if (!level) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-amber-100 p-4 text-amber-950">
      <p className="flex-1 text-sm">
        {t("notice.nativeHelpStopped", { level, where: t(inSettings ? "notice.whereBelow" : "notice.whereSettings") })}
      </p>
      <button
        type="button"
        onClick={() => void db.meta.delete(NATIVE_HELP_STOPPED)}
        className="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold underline"
      >
        {t("notice.understood")}
      </button>
    </div>
  );
}
