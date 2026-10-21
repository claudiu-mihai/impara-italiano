import { State } from "ts-fsrs";
import { LEVELS, type Level } from "../content/constants.ts";
import { masteryByWord, MASTERED_STABILITY_DAYS } from "../srs/mastery.ts";
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

export interface Stats {
  streak: number;
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

export interface ComputeStatsArgs {
  now: Date;
  days: number;
  log: readonly LogRow[];
  cards: readonly StoredCard[];
  words: readonly { id: string; level: Level }[];
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
  const conjCards = cards.filter((c) => c.kind === "conj" && c.state !== State.New);

  return {
    streak: currentStreak(reviewsByDay, today),
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
