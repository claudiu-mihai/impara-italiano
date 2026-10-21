const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Eticheta scurtă a unui interval, pentru butoanele de evaluare (ex. „10 min”, „3 zile”). */
export function formatInterval(due: Date, now: Date): string {
  const ms = Math.max(0, due.getTime() - now.getTime());
  if (ms < MINUTE) return "< 1 min";
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = Math.round(ms / DAY);
  if (days < 30) return days === 1 ? "1 zi" : `${days} zile`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "1 lună" : `${months} luni`;
  const years = Math.round((days / 365) * 10) / 10;
  return years === 1 ? "1 an" : `${years} ani`;
}
