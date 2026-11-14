import { isDue } from "../session/buildDailySession.ts";
import { skillCardId, type StoredCard } from "../srs/types.ts";
import { endOfStudyDay } from "../time/studyDay.ts";

/**
 * Identificatorii și scadența cardurilor de gramatică, fără planificatorul FSRS: le folosesc și ecranele de la pornire
 * (Acasă), care nu trebuie să încarce `ts-fsrs`. Notarea și crearea cardului sunt în `review.ts`.
 */
export const grammarSkillId = (topicId: string) => `grammar:${topicId}`;
export const grammarCardId = (topicId: string) => skillCardId(grammarSkillId(topicId));

/** Prima rundă se notează la o lecție nouă (fără card) sau scadentă; la una programată pentru mai târziu e exersare liberă. */
export function grammarCountsForSrs(card: StoredCard | undefined, now: Date): boolean {
  return !card || isDue(card, now, endOfStudyDay(now));
}

const PREFIX = grammarCardId("");

/** Id-urile lecțiilor cu repetiția scadentă azi, doar din carduri (fără conținutul lecțiilor). */
export function dueGrammarIds(cards: readonly StoredCard[], now: Date): string[] {
  const endOfDay = endOfStudyDay(now);
  return cards.filter((c) => c.cardId.startsWith(PREFIX) && isDue(c, now, endOfDay)).map((c) => c.cardId.slice(PREFIX.length));
}

/** Lecțiile cu repetiția scadentă azi, în ordinea dată (ordinea de învățare). */
export function dueGrammarTopics<T extends { id: string }>(topics: readonly T[], cards: readonly StoredCard[], now: Date): T[] {
  const due = new Set(dueGrammarIds(cards, now));
  return topics.filter((t) => due.has(t.id));
}
