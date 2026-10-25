import { useEffect, useMemo, useState } from "react";
import { greetingFor } from "../../domain/greeting.ts";
import { useT } from "../../i18n/index.ts";
import { Lupino } from "../../ui/mascot/Lupino.tsx";

/** Cât stă Lupino pe ecran, apoi cât durează dispariția. */
export const SPLASH_MS = 3000;
const FADE_MS = 300;

/**
 * Lupino te salută la deschiderea aplicației, după ora din zi, apoi lasă loc ecranului Acasă (care e deja dedesubt).
 * O atingere, Enter, Spațiu sau Esc sar peste așteptare.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const greeting = useMemo(() => greetingFor(new Date()), []);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), SPLASH_MS);
    const onKey = (event: KeyboardEvent) => {
      if (["Enter", "Escape", " "].includes(event.key)) setLeaving(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(onDone, reduced ? 0 : FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div
      data-testid="splash"
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center transition-opacity duration-300 motion-reduce:transition-none dark:bg-slate-950 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="splash-lupino">
        <Lupino pose="ciao" size={220} />
      </div>
      <div role="status" className="splash-text">
        <p lang="it" className="text-4xl font-bold">
          {greeting.it}
        </p>
        <p className="mt-1 text-lg text-muted">{greeting.ro}</p>
      </div>
      <p className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-muted">{t("splash.tap")}</p>
    </div>
  );
}
