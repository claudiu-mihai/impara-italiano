import aDomani from "./lupino-a-domani.svg";
import bravo from "./lupino-bravo.svg";
import cap from "./lupino-cap.svg";
import ciao from "./lupino-ciao.svg";
import inBoccaAlLupo from "./lupino-in-bocca-al-lupo.svg";
import pensa from "./lupino-pensa.svg";
import serie from "./lupino-serie.svg";

/** Ipostazele lui Lupino, mascota aplicației (desenele din design/lupino/, vectorizate cu `npm run mascot`). */
export type LupinoPose = "ciao" | "in-bocca-al-lupo" | "bravo" | "serie" | "pensa" | "a-domani" | "cap";

const SRC: Record<LupinoPose, string> = {
  ciao,
  "in-bocca-al-lupo": inBoccaAlLupo,
  bravo,
  serie,
  pensa,
  "a-domani": aDomani,
  cap,
};

interface LupinoProps {
  pose: LupinoPose;
  /** Latura, în pixeli (desenele sunt pătrate). */
  size?: number;
  className?: string;
}

/**
 * Lupino, decorativ: textul pe care îl „spune” stă lângă el, în aplicație, nu în desen. În tema întunecată primește
 * un contur alb subțire (clasa `mascot` din index.css), ca simbolurile negre („?”, „zzz”) și conturul să se vadă.
 */
export function Lupino({ pose, size = 120, className = "" }: LupinoProps) {
  return (
    <img
      src={SRC[pose]}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`mascot shrink-0 select-none ${className}`}
    />
  );
}

interface LupinoSaysProps extends LupinoProps {
  /** Fraza în italiană, din balon. */
  it: string;
  /** Traducerea sau explicația în română, sub frază. */
  ro: string;
}

/** Lupino cu un balon: fraza italiană (marcată `lang="it"`, ca vocea și cititoarele de ecran s-o pronunțe corect) și traducerea. */
export function LupinoSays({ pose, size = 104, it, ro, className = "" }: LupinoSaysProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Lupino pose={pose} size={size} />
      <div className="relative min-w-0 flex-1 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 bg-slate-100 dark:bg-slate-800"
        />
        <p lang="it" className="relative text-lg font-bold">
          {it}
        </p>
        <p className="relative text-sm text-muted">{ro}</p>
      </div>
    </div>
  );
}
