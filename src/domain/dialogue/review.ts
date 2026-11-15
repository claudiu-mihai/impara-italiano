import type { Grade } from "ts-fsrs";
import { newStoredCard, reviewStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { studyDayOf } from "../time/studyDay.ts";
import { dialogueCardId, dialogueSkillId } from "./due.ts";

/**
 * Repetiția dialogurilor: fiecare dialog are un card FSRS de tip „abilitate” (`skill:dialogue:<id>`), ca lecțiile de
 * gramatică, deci backup-ul și sincronizarea îl tratează fără nicio schimbare. Nota o dă cursantul după jocul de rol.
 */
export function newDialogueCard(id: string, now: Date): StoredCard {
  return newStoredCard({ cardId: dialogueCardId(id), wordId: dialogueSkillId(id), kind: "skill", variant: "auto" }, now, studyDayOf(now));
}

/** Notează un joc de rol (cardul se creează la primul). Fără pașii scurți FSRS: dialogul revine peste cel puțin o zi. */
export function reviewDialogueCard(card: StoredCard | undefined, id: string, grade: Grade, now: Date, retention: number) {
  return reviewStoredCard(card ?? newDialogueCard(id, now), grade, now, retention, false);
}
