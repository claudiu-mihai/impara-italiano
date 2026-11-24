import { useT } from "../../i18n/index.ts";
import { Lupino } from "../../ui/mascot/Lupino.tsx";

/**
 * Primul card: apare imediat, fără date. Atingerea e gestul care deblochează sunetul pe iOS, apoi fluxul pornește.
 */
export function StartCard({ onStart }: { onStart: () => void }) {
  const { t } = useT();
  return (
    <button type="button" onClick={onStart} className="flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center">
      <Lupino pose="ciao" size={200} />
      <span className="rounded-2xl bg-brand px-8 py-4 text-xl font-bold text-white">{t("feed.start")}</span>
    </button>
  );
}
