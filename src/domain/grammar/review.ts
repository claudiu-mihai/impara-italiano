import { Rating, type Grade } from "ts-fsrs";
import { newStoredCard, reviewStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { studyDayOf } from "../time/studyDay.ts";
import { grammarCardId, grammarSkillId } from "./due.ts";

/**
 * Repetiția lecțiilor de gramatică: fiecare lecție are un card FSRS de tip „abilitate” (`skill:grammar:<id>`), ca numerele
 * și ceasul, deci backup-ul și sincronizarea îl tratează fără nicio schimbare. Se notează din jocul „Scrie”.
 */
export { dueGrammarTopics, grammarCardId, grammarCountsForSrs, grammarSkillId } from "./due.ts";

export function newGrammarCard(topicId: string, now: Date): StoredCard {
  return newStoredCard({ cardId: grammarCardId(topicId), wordId: grammarSkillId(topicId), kind: "skill", variant: "auto" }, now, studyDayOf(now));
}

/** Pragul pentru „Greu”: sub atâta (din răspunsuri) e „Din nou”. */
export const GRAMMAR_HARD_SHARE = 0.8;

/** Nota din scorul la „Scrie”: totul corect → Bine, cel puțin 80% → Greu, mai puțin → Din nou. */
export function gradeGrammar(correct: number, total: number): Grade {
  if (total === 0) return Rating.Again;
  if (correct === total) return Rating.Good;
  return correct / total >= GRAMMAR_HARD_SHARE ? Rating.Hard : Rating.Again;
}

/**
 * Notează o repetiție a lecției (cardul se creează la prima). Fără pașii scurți FSRS (1 și 10 minute): runda de 10 exemple
 * e deja exercițiu, deci lecția revine abia peste cel puțin o zi, nu peste câteva minute.
 */
export function reviewGrammarCard(card: StoredCard | undefined, topicId: string, grade: Grade, now: Date, retention: number) {
  return reviewStoredCard(card ?? newGrammarCard(topicId, now), grade, now, retention, false);
}
