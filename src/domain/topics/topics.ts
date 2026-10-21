import type { Topic } from "../content/schema.ts";
import type { Direction, StoredCard } from "../srs/types.ts";
import { masteryByWord } from "../srs/mastery.ts";
import { vocabCardId } from "../srs/types.ts";
import { isDue, type SessionItem } from "../session/buildDailySession.ts";
import { interleave } from "../session/interleave.ts";
import { endOfStudyDay } from "../time/studyDay.ts";

/** Câte cuvinte noi se introduc la o sesiune „Studiază tema”. */
export const TOPIC_NEW_PER_SESSION = 10;

/** Id-urile cuvintelor unei teme, în ordinea fișei (fără duplicate). */
export function topicWordIds(topic: Pick<Topic, "subgroups">): string[] {
  return [...new Set(topic.subgroups.flatMap((s) => s.wordIds))];
}

export interface TopicProgress {
  total: number;
  /** Cuvinte cu cel puțin un card de vocabular. */
  started: number;
  mastered: number;
}

export function topicProgress(topic: Pick<Topic, "subgroups">, cards: readonly StoredCard[]): TopicProgress {
  const ids = topicWordIds(topic);
  const mastery = masteryByWord(cards as StoredCard[]);
  return {
    total: ids.length,
    started: ids.filter((id) => mastery.has(id)).length,
    mastered: ids.filter((id) => mastery.get(id) === "mastered").length,
  };
}

/** Temele a căror abilitate (numere, ora) a fost începută și are repetiția scadentă. */
export function dueSkillTopics<T extends Pick<Topic, "skill">>(topics: readonly T[], cards: readonly StoredCard[], now: Date): T[] {
  const endOfDay = endOfStudyDay(now);
  const due = new Set(cards.filter((c) => c.kind === "skill" && isDue(c, now, endOfDay)).map((c) => c.wordId));
  return topics.filter((t) => t.skill !== undefined && due.has(t.skill));
}

export interface TopicSessionArgs {
  now: Date;
  direction: Direction;
  cards: readonly StoredCard[];
  wordIds: readonly string[];
  maxNew?: number;
}

/**
 * Sesiunea „Studiază tema”: repetițiile scadente ale cuvintelor temei, cu cuvinte noi din temă intercalate.
 * Folosește aceleași carduri FSRS ca sesiunea zilnică, deci progresul este comun.
 */
export function buildTopicSession({
  now,
  direction,
  cards,
  wordIds,
  maxNew = TOPIC_NEW_PER_SESSION,
}: TopicSessionArgs): SessionItem[] {
  const inTopic = new Set(wordIds);
  const endOfDay = endOfStudyDay(now);
  const vocab = cards.filter((c) => c.kind === "vocab" && c.variant === direction && inTopic.has(c.wordId));

  const reviews = vocab
    .filter((c) => isDue(c, now, endOfDay))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map((c): SessionItem => ({ cardId: c.cardId, wordId: c.wordId, variant: direction, isNew: false }));

  const known = new Set(vocab.map((c) => c.wordId));
  const fresh = wordIds
    .filter((id) => !known.has(id))
    .slice(0, maxNew)
    .map((id): SessionItem => ({ cardId: vocabCardId(id, direction), wordId: id, variant: direction, isNew: true }));

  return interleave(reviews, fresh);
}
