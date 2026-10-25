const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Textele intervalelor din `i18n` (cu forme de plural): `interval.days_one`, `interval.days_other`… */
export type IntervalBase =
  | "interval.lessThanMinute"
  | "interval.minutes"
  | "interval.hours"
  | "interval.days"
  | "interval.months"
  | "interval.years";

/** Scrie un interval: de obicei `tp` din `useT()`, care alege forma de plural a limbii. */
export type IntervalFormatter = (base: IntervalBase, n: number) => string;

/** Eticheta scurtă a unui interval, pentru butoanele de evaluare (ex. „10 min”, „3 zile”). */
export function formatInterval(due: Date, now: Date, format: IntervalFormatter): string {
  const ms = Math.max(0, due.getTime() - now.getTime());
  if (ms < MINUTE) return format("interval.lessThanMinute", 0);
  if (ms < HOUR) return format("interval.minutes", Math.round(ms / MINUTE));
  if (ms < DAY) return format("interval.hours", Math.round(ms / HOUR));
  const days = Math.round(ms / DAY);
  if (days < 30) return format("interval.days", days);
  const months = Math.round(days / 30);
  if (months < 12) return format("interval.months", months);
  return format("interval.years", Math.round((days / 365) * 10) / 10);
}
