import { State } from "ts-fsrs";
import { LEVELS, POS, type Level, type Pos } from "../content/constants.ts";
import { masteryByWord, MASTERED_STABILITY_DAYS, type Mastery } from "../srs/mastery.ts";
import type { StoredCard } from "../srs/types.ts";
import { addDays } from "../time/dayMath.ts";
import { endOfStudyDay, studyDayOf } from "../time/studyDay.ts";

/** Repetiții minime într-o zi ca ea să conteze pentru streak. */
export const MIN_REVIEWS_FOR_STREAK = 10;

export interface LogRow {
  studyDay: string;
  /** 1 = Din nou, 2 = Greu, 3 = Bine, 4 = Ușor. */
  rating: number;
}

export interface DayStat {
  day: string;
  reviews: number;
  correct: number;
  newCards: number;
}

export interface LevelProgress {
  level: Level;
  /** Cuvintele dicționarului la acest nivel. */
  total: number;
  /** Câte au măcar un card (au fost începute). */
  started: number;
  /** Câte sunt stăpânite (stabilitate ≥ 21 de zile). */
  mastered: number;
}

/** Câte săptămâni are calendarul de activitate. */
export const CALENDAR_WEEKS = 16;

/** Intensitatea unei zile în calendar: 0 = nicio repetiție, 4 = de cel puțin 3 ori pragul pentru serie. */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface CalendarDay {
  day: string;
  reviews: number;
  level: ActivityLevel;
  /** Zi de după azi, în ultima săptămână: nu se colorează. */
  future: boolean;
}

export interface CategoryStat {
  pos: Pos;
  /** Cuvintele din dicționar din această categorie. */
  total: number;
  learning: number;
  mastered: number;
}

export interface Stats {
  /** Câte cuvinte sunt noi (fără card), în învățare sau stăpânite, din tot dicționarul. */
  progress: Record<Mastery, number>;
  /** Cuvintele pe categorii gramaticale (în ordinea fixă a categoriilor, doar cele prezente), cu progresul lor. */
  categories: CategoryStat[];
  streak: number;
  /** Cea mai lungă serie din toată istoria (zile consecutive cu cel puțin MIN_REVIEWS_FOR_STREAK repetiții). */
  longestStreak: number;
  /** Zile de studiu în care s-a făcut cel puțin o repetiție, în total. */
  activeDays: number;
  /** Prima zi cu repetiții, sau null fără date. */
  firstDay: string | null;
  /** Ultimele CALENDAR_WEEKS săptămâni, de la cea mai veche; fiecare săptămână are 7 zile, de luni până duminică. */
  calendar: CalendarDay[][];
  todayReviews: number;
  /** Ultimele `days` zile, de la cea mai veche la azi. */
  daily: DayStat[];
  /** Carduri scadente în următoarele 7 zile; „azi” include restanțele. */
  forecast: { day: string; due: number }[];
  /** Progresul pe fiecare nivel CEFR, de la A1 la C2 (inclusiv nivelurile fără cuvinte). */
  levels: LevelProgress[];
  vocab: { learned: number; mastered: number };
  conj: { learned: number; mastered: number };
  /** Procentul de răspunsuri corecte în fereastra afișată (Greu/Bine/Ușor), sau null fără date. */
  accuracy: number | null;
}

/**
 * Streak-ul curent: zile consecutive cu cel puțin MIN_REVIEWS_FOR_STREAK repetiții.
 * Dacă azi nu s-a atins încă pragul, streak-ul continuă de ieri (nu se pierde până la sfârșitul zilei).
 */
export function currentStreak(reviewsByDay: ReadonlyMap<string, number>, today: string): number {
  const reached = (day: string) => (reviewsByDay.get(day) ?? 0) >= MIN_REVIEWS_FOR_STREAK;
  let day = reached(today) ? today : addDays(today, -1);
  let streak = 0;
  while (reached(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** Cea mai lungă serie de zile consecutive cu cel puțin MIN_REVIEWS_FOR_STREAK repetiții. */
export function longestStreak(reviewsByDay: ReadonlyMap<string, number>): number {
  const reached = [...reviewsByDay].filter(([, n]) => n >= MIN_REVIEWS_FOR_STREAK).map(([day]) => day).sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const day of reached) {
    run = previous !== undefined && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export function activityLevel(reviews: number): ActivityLevel {
  if (reviews <= 0) return 0;
  if (reviews < MIN_REVIEWS_FOR_STREAK / 2) return 1;
  if (reviews < MIN_REVIEWS_FOR_STREAK) return 2;
  if (reviews < MIN_REVIEWS_FOR_STREAK * 3) return 3;
  return 4;
}

/** Ziua săptămânii a unei zile de studiu, cu luni = 0 și duminică = 6. */
const weekdayOf = (day: string): number => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/**
 * Calendarul de activitate: `weeks` săptămâni calendaristice (luni–duminică) care se termină cu cea de azi.
 * Zilele de după azi din ultima săptămână sunt marcate `future`.
 */
export function activityCalendar(
  reviewsByDay: ReadonlyMap<string, number>,
  today: string,
  weeks: number = CALENDAR_WEEKS,
): CalendarDay[][] {
  const thisMonday = addDays(today, -weekdayOf(today));
  const start = addDays(thisMonday, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d): CalendarDay => {
      const day = addDays(start, w * 7 + d);
      const reviews = reviewsByDay.get(day) ?? 0;
      return { day, reviews, level: activityLevel(reviews), future: day > today };
    }),
  );
}

export interface ComputeStatsArgs {
  now: Date;
  days: number;
  log: readonly LogRow[];
  cards: readonly StoredCard[];
  words: readonly { id: string; level: Level; pos: Pos }[];
}

export function computeStats({ now, days, log, cards, words }: ComputeStatsArgs): Stats {
  const today = studyDayOf(now);

  const reviewsByDay = new Map<string, number>();
  const correctByDay = new Map<string, number>();
  for (const row of log) {
    reviewsByDay.set(row.studyDay, (reviewsByDay.get(row.studyDay) ?? 0) + 1);
    if (row.rating >= 2) correctByDay.set(row.studyDay, (correctByDay.get(row.studyDay) ?? 0) + 1);
  }

  const newByDay = new Map<string, number>();
  for (const card of cards) newByDay.set(card.introducedOn, (newByDay.get(card.introducedOn) ?? 0) + 1);

  const daily: DayStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    daily.push({
      day,
      reviews: reviewsByDay.get(day) ?? 0,
      correct: correctByDay.get(day) ?? 0,
      newCards: newByDay.get(day) ?? 0,
    });
  }
  const windowReviews = daily.reduce((sum, d) => sum + d.reviews, 0);
  const windowCorrect = daily.reduce((sum, d) => sum + d.correct, 0);

  const endOfToday = endOfStudyDay(now).getTime();
  const forecast = Array.from({ length: 7 }, (_, i) => ({ day: addDays(today, i), due: 0 }));
  for (const card of cards) {
    const dueDay = card.due.getTime() < endOfToday ? today : studyDayOf(card.due);
    const slot = forecast.find((f) => f.day === dueDay);
    if (slot) slot.due++;
  }

  const mastery = masteryByWord([...cards]);
  const levels = LEVELS.map((level): LevelProgress => {
    const inLevel = words.filter((w) => w.level === level);
    return {
      level,
      total: inLevel.length,
      started: inLevel.filter((w) => mastery.has(w.id)).length,
      mastered: inLevel.filter((w) => mastery.get(w.id) === "mastered").length,
    };
  });
  const wordLevels = [...mastery.values()];
  const progress: Record<Mastery, number> = { new: 0, learning: 0, mastered: 0 };
  for (const word of words) progress[mastery.get(word.id) ?? "new"]++;
  const categories = POS.flatMap((pos): CategoryStat[] => {
    const inCategory = words.filter((w) => w.pos === pos);
    if (inCategory.length === 0) return [];
    return [
      {
        pos,
        total: inCategory.length,
        learning: inCategory.filter((w) => mastery.get(w.id) === "learning").length,
        mastered: inCategory.filter((w) => mastery.get(w.id) === "mastered").length,
      },
    ];
  });
  const conjCards = cards.filter((c) => c.kind === "conj" && c.state !== State.New);

  const activeDays = [...reviewsByDay.keys()].sort();

  return {
    progress,
    categories,
    streak: currentStreak(reviewsByDay, today),
    longestStreak: longestStreak(reviewsByDay),
    activeDays: activeDays.length,
    firstDay: activeDays[0] ?? null,
    calendar: activityCalendar(reviewsByDay, today),
    todayReviews: reviewsByDay.get(today) ?? 0,
    daily,
    forecast,
    levels,
    vocab: { learned: wordLevels.length, mastered: wordLevels.filter((l) => l === "mastered").length },
    conj: {
      learned: conjCards.length,
      mastered: conjCards.filter((c) => c.stability >= MASTERED_STABILITY_DAYS).length,
    },
    accuracy: windowReviews === 0 ? null : Math.round((windowCorrect / windowReviews) * 100),
  };
}
