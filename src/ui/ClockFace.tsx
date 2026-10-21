import { formatDigital, type ClockTime } from "../domain/skills/time.ts";

interface ClockFaceProps {
  time: ClockTime;
  size?: number;
  /** Textul alternativ; implicit ora în cifre (cititoarele de ecran nu văd cadranul). */
  label?: string;
}

/** Cadran analogic desenat în SVG, cu limbile ceasului în poziția orei date. */
export function ClockFace({ time, size = 180, label }: ClockFaceProps) {
  const hourAngle = ((time.hour % 12) + time.minute / 60) * 30;
  const minuteAngle = time.minute * 6;
  const hand = (angle: number, length: number, width: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return (
      <line
        x1="50"
        y1="50"
        x2={50 + length * Math.cos(rad)}
        y2={50 + length * Math.sin(rad)}
        stroke="currentColor"
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label ?? `Ceas: ${formatDigital(time)}`}>
      <circle cx="50" cy="50" r="47" fill="white" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
      {Array.from({ length: 12 }, (_, i) => {
        const rad = ((i * 30 - 90) * Math.PI) / 180;
        const major = i % 3 === 0;
        return (
          <line
            key={i}
            x1={50 + (major ? 36 : 39) * Math.cos(rad)}
            y1={50 + (major ? 36 : 39) * Math.sin(rad)}
            x2={50 + 43 * Math.cos(rad)}
            y2={50 + 43 * Math.sin(rad)}
            stroke="#334155"
            strokeWidth={major ? 2.5 : 1.2}
          />
        );
      })}
      <g className="text-slate-900">
        {hand(hourAngle, 24, 4)}
        {hand(minuteAngle, 36, 2.5)}
      </g>
      <circle cx="50" cy="50" r="3" fill="#0f172a" />
    </svg>
  );
}
