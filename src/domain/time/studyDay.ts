/** Ora locală la care începe o nouă zi de studiu. */
export const DAY_START_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, "0");

/** Ziua de studiu (YYYY-MM-DD, calendar local) căreia îi aparține momentul dat. */
export function studyDayOf(date: Date): string {
  const d = new Date(date);
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Începutul următoarei zile de studiu (04:00 local), adică sfârșitul celei curente. */
export function endOfStudyDay(date: Date): Date {
  const d = new Date(date);
  if (d.getHours() >= DAY_START_HOUR) d.setDate(d.getDate() + 1);
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d;
}
