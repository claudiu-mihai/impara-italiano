import { useEffect, useRef, useState } from "react";
import bravo from "./lupino-bravo.svg";
import cap from "./lupino-cap.svg";
import ciao from "./lupino-ciao.svg";
import inBoccaAlLupo from "./lupino-in-bocca-al-lupo.svg";
import pensa from "./lupino-pensa.svg";
import relax from "./lupino-relax.svg";
import serie from "./lupino-serie.svg";

/**
 * Ipostazele lui Lupino, mascota aplicației (desenele din design/lupino/, vectorizate cu `npm run mascot`).
 * lupino-a-domani.svg (somnoros) e generat, dar nu e folosit încă, deci nu intră în build; e păstrat pentru notificări.
 */
export type LupinoPose = "ciao" | "in-bocca-al-lupo" | "bravo" | "serie" | "pensa" | "relax" | "cap";

const SRC: Record<LupinoPose, string> = {
  ciao,
  "in-bocca-al-lupo": inBoccaAlLupo,
  bravo,
  serie,
  pensa,
  relax,
  cap,
};

/** Adresa desenului unei ipostaze (pentru scene SVG compuse, ca în „Unde e Lupino?”). */
export const lupinoSrc = (pose: LupinoPose): string => SRC[pose];

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

interface LupinoFillProps {
  pose: LupinoPose;
  /** Ce parte din înălțimea spațiului liber ocupă Lupino. */
  ratio?: number;
  /** Latura minimă și maximă, în pixeli. */
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Lupino care umple spațiul liber: containerul crește cât locul rămas în coloană (flex-1), iar Lupino ia `ratio` din
 * înălțimea lui, între `min` și `max`. Pe ecrane mici rămâne cel puțin `min`, ca restul paginii să încapă.
 */
export function LupinoFill({ pose, ratio = 0.5, min = 64, max = 320, className = "" }: LupinoFillProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(min);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const free = entry?.contentRect.height ?? 0;
      setSize(Math.round(Math.min(max, Math.max(min, free * ratio))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratio, min, max]);
  return (
    <div ref={box} className="flex flex-1 items-center justify-center" style={{ minHeight: min }}>
      <Lupino pose={pose} size={size} className={className} />
    </div>
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
