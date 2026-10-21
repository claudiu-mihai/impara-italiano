import { State } from "ts-fsrs";
import type { Level, Pos } from "../content/constants.ts";
import { isUpTo } from "../content/levels.ts";
import { endOfStudyDay, studyDayOf } from "../time/studyDay.ts";
import type { Direction, StoredCard } from "../srs/types.ts";
import { vocabCardId } from "../srs/types.ts";
import { interleave } from "./interleave.ts";
import { orderNewWords } from "./orderNewWords.ts";

/** Cardurile aflate în (re)învățare apar în sesiune cu cel mult atât înainte de scadență. */
export const LEARN_AHEAD_MS = 20 * 60 * 1000;

export interface SessionSettings {
  /** Cuvinte noi se introduc doar până la acest nivel. */
  level: Level;
  newPerDay: number;
  maxReviewsPerDay: number;
  direction: Direction;
}

export interface SessionItem {
  cardId: string;
  wordId: string;
  variant: Direction;
  isNew: boolean;
}

export interface BuildSessionArgs {
  now: Date;
  settings: SessionSettings;
  cards: StoredCard[];
  /** Cuvintele disponibile pentru introducere. */
  words: { id: string; rank: number; level: Level; pos: Pos }[];
  /** Repetiții deja făcute în ziua de studiu curentă. */
  reviewsDoneToday: number;
}

export function isDue(card: StoredCard, now: Date, endOfDay: Date): boolean {
  // Cardurile din faza de repetare se iau pe zile întregi; cele din (re)învățare, când vine ora lor.
  if (card.state === State.Review) return card.due.getTime() < endOfDay.getTime();
  return card.due.getTime() <= now.getTime() + LEARN_AHEAD_MS;
}

/**
 * Coada sesiunii zilnice: repetițiile scadente (cele mai întârziate primele),
 * cu un card nou intercalat la fiecare REVIEWS_PER_NEW repetiții.
 */
export function buildDailySession({
  now,
  settings,
  cards,
  words,
  reviewsDoneToday,
}: BuildSessionArgs): SessionItem[] {
  const { direction } = settings;
  const today = studyDayOf(now);
  const endOfDay = endOfStudyDay(now);
  const vocab = cards.filter((c) => c.kind === "vocab" && c.variant === direction);

  const reviewBudget = Math.max(0, settings.maxReviewsPerDay - reviewsDoneToday);
  const reviews = vocab
    .filter((c) => isDue(c, now, endOfDay))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, reviewBudget);

  const introducedToday = vocab.filter((c) => c.introducedOn === today).length;
  const newBudget = Math.max(0, settings.newPerDay - introducedToday);
  const known = new Set(vocab.map((c) => c.wordId));
  const fresh = orderNewWords(words.filter((w) => !known.has(w.id) && isUpTo(w.level, settings.level))).slice(
    0,
    newBudget,
  );

  return interleave(
    reviews.map((c): SessionItem => ({ cardId: c.cardId, wordId: c.wordId, variant: direction, isNew: false })),
    fresh.map(
      (w): SessionItem => ({ cardId: vocabCardId(w.id, direction), wordId: w.id, variant: direction, isNew: true }),
    ),
  );
}
