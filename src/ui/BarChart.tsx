export interface Bar {
  label: string;
  value: number;
  /** Text pentru tooltip și cititoare de ecran. */
  title: string;
}

interface BarChartProps {
  bars: Bar[];
  ariaLabel: string;
  /** Eticheta de sub bară apare la fiecare N bare (pentru grafice dense). */
  labelEvery?: number;
}

/** Grafic cu bare, simplu și accesibil, fără dependențe. */
export function BarChart({ bars, ariaLabel, labelEvery = 1 }: BarChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="flex h-32 items-end gap-1" aria-hidden="true">
        {bars.map((bar, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={bar.title}>
            <div
              className={`w-full rounded-t ${bar.value > 0 ? "bg-brand" : "bg-slate-200 dark:bg-slate-700"}`}
              style={{ height: bar.value > 0 ? `${Math.max(4, (bar.value / max) * 100)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-muted" aria-hidden="true">
        {bars.map((bar, i) => (
          <span key={i} className="flex-1 text-center">
            {i % labelEvery === 0 ? bar.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
