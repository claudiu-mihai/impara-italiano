import { isDue } from "../session/buildDailySession.ts";
import { TENSE_UNLOCK_STABILITY_DAYS } from "../srs/unlock.ts";
import { skillCardId, type StoredCard } from "../srs/types.ts";
import { endOfStudyDay } from "../time/studyDay.ts";

/**
 * Identificatorii, scadența și „învățat” pentru cardurile de dialog, fără planificatorul FSRS: le folosește și Acasă,
 * care nu trebuie să încarce `ts-fsrs`. Notarea și crearea cardului sunt în `review.ts`.
 */
export const dialogueSkillId = (id: string) => `dialogue:${id}`;
export const dialogueCardId = (id: string) => skillCardId(dialogueSkillId(id));

const PREFIX = dialogueCardId("");

/** Primul joc de rol se notează la un dialog nou (fără card) sau scadent; la unul programat mai târziu e exersare liberă. */
export function dialogueCountsForSrs(card: StoredCard | undefined, now: Date): boolean {
  return !card || isDue(card, now, endOfStudyDay(now));
}

/** Există măcar un card de dialog (de atunci Acasă arată reperele „pot să…”). */
export function hasDialogueCards(cards: readonly StoredCard[]): boolean {
  return cards.some((c) => c.cardId.startsWith(PREFIX));
}

/** Id-urile dialogurilor cu repetiția scadentă azi, doar din carduri. */
export function dueDialogueIds(cards: readonly StoredCard[], now: Date): string[] {
  const endOfDay = endOfStudyDay(now);
  return cards.filter((c) => c.cardId.startsWith(PREFIX) && isDue(c, now, endOfDay)).map((c) => c.cardId.slice(PREFIX.length));
}

/** Dialogurile scadente azi, în ordinea dată. */
export function dueDialogues<T extends { id: string }>(dialogues: readonly T[], cards: readonly StoredCard[], now: Date): T[] {
  const due = new Set(dueDialogueIds(cards, now));
  return dialogues.filter((d) => due.has(d.id));
}

/** Dialog învățat (reperul „pot să…” bifat): stabilitate de cel puțin 7 zile, ca la deblocarea timpurilor verbale. */
export function isDialogueLearned(card: StoredCard | undefined): boolean {
  return card !== undefined && card.stability >= TENSE_UNLOCK_STABILITY_DAYS;
}
