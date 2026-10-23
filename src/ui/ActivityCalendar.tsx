import type { ActivityLevel, CalendarDay } from "../domain/stats/stats.ts";

const LEVEL_CLASS: Record<ActivityLevel, string> = {
  0: "bg-slate-200 dark:bg-slate-800",
  1: "bg-brand/30",
  2: "bg-brand/55",
  3: "bg-brand/80",
  4: "bg-brand",
};

const LEGEND_LEVELS: ActivityLevel[] = [0, 1, 2, 3, 4];

interface ActivityCalendarProps {
  /** Săptămâni de la cea mai veche; fiecare cu 7 zile, luni–duminică. */
  weeks: CalendarDay[][];
  ariaLabel: string;
}

const dayLabel = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

/** Calendar de activitate (o coloană pe săptămână, luni sus), colorat după numărul de repetiții din zi. */
export function ActivityCalendar({ weeks, ariaLabel }: ActivityCalendarProps) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1"
        style={{ gridAutoColumns: "minmax(0, 1fr)" }}
        aria-hidden="true"
      >
        {weeks.flat().map((d) => (
          <div
            key={d.day}
            title={d.future ? undefined : `${dayLabel(d.day)}: ${d.reviews} repetiții`}
            className={`aspect-square rounded-sm ${d.future ? "bg-transparent" : LEVEL_CLASS[d.level]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted" aria-hidden="true">
        <span>mai puțin</span>
        {LEGEND_LEVELS.map((level) => (
          <span key={level} className={`size-3 rounded-sm ${LEVEL_CLASS[level]}`} />
        ))}
        <span>mai mult</span>
      </div>
    </div>
  );
}
