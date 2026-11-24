import type { Direction, StoredCard } from "../srs/types.ts";
import { isDue } from "../session/buildDailySession.ts";
import { endOfStudyDay } from "../time/studyDay.ts";

/** Combo-ul are o animație mai mare la aceste valori. */
export const COMBO_MILESTONES = [3, 5, 10, 20] as const;

export const nextCombo = (combo: number, correct: boolean): number => (correct ? combo + 1 : 0);

export const isComboMilestone = (combo: number): boolean => (COMBO_MILESTONES as readonly number[]).includes(combo);

/** Cardul de bilanț apare la 25, 50, 100, apoi la fiecare 100 de carduri din aceeași vizită. */
export const isMilestone = (count: number): boolean => count === 25 || count === 50 || (count >= 100 && count % 100 === 0);

/** Grila de după un cuvânt nou se notează doar dacă e IT → RO și cardul e scadent acum (ca în quiz); altfel e exersare liberă. */
export function shouldGradeFollowUp(card: StoredCard | undefined, direction: Direction, now: Date): boolean {
  return card !== undefined && direction === "it-ro" && isDue(card, now, endOfStudyDay(now));
}
