import { answerText } from "../content/display.ts";
import type { CoreWord } from "../content/types.ts";
import { shuffle, type Random } from "../random.ts";
import { isDue } from "../session/buildDailySession.ts";
import type { Direction, StoredCard } from "../srs/types.ts";
import { vocabCardId } from "../srs/types.ts";
import { endOfStudyDay } from "../time/studyDay.ts";
import { pickDistractors } from "./distractors.ts";

export const QUIZ_ROUND_SIZE = 10;

export interface QuizQuestion {
  cardId: string;
  wordId: string;
  direction: Direction;
  options: string[];
  correctIndex: number;
}

export interface QuizRoundArgs {
  now: Date;
  direction: Direction;
  cards: StoredCard[];
  words: readonly CoreWord[];
  size?: number;
  random?: Random;
}

/**
 * O rundă de quiz din cuvintele deja introduse: întâi cele scadente (cele mai întârziate primele),
 * apoi cele cu stabilitatea cea mai mică. Fiecare întrebare are 4 variante.
 */
export function buildQuizRound({
  now,
  direction,
  cards,
  words,
  size = QUIZ_ROUND_SIZE,
  random = Math.random,
}: QuizRoundArgs): QuizQuestion[] {
  const endOfDay = endOfStudyDay(now);
  const byId = new Map(words.map((w) => [w.id, w]));

  const vocab = cards.filter((c) => c.kind === "vocab" && c.variant === direction && byId.has(c.wordId));
  const due = vocab
    .filter((c) => isDue(c, now, endOfDay))
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  const dueIds = new Set(due.map((c) => c.cardId));
  const rest = vocab.filter((c) => !dueIds.has(c.cardId)).sort((a, b) => a.stability - b.stability);

  return [...due, ...rest].slice(0, size).map((card) => {
    const word = byId.get(card.wordId)!;
    const correct = answerText(word, direction);
    const wrong = pickDistractors({ target: word, pool: words, direction, random }).map((w) =>
      answerText(w, direction),
    );
    const options = shuffle([correct, ...wrong], random);
    return {
      cardId: card.cardId,
      wordId: word.id,
      direction,
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}

export interface TopicQuizArgs {
  now: Date;
  direction: Direction;
  cards: StoredCard[];
  /** Cuvintele temei, în ordinea fișei. */
  topicWords: readonly CoreWord[];
  /** Tot dicționarul, pentru variante greșite când tema nu are destule. */
  words: readonly CoreWord[];
  size?: number;
  random?: Random;
}

/**
 * O rundă de quiz doar cu cuvintele unei teme: întâi cele scadente, apoi cele noi (fără card) și restul.
 * Variantele greșite se aleg întâi din aceeași temă, apoi din tot dicționarul.
 */
export function buildTopicQuizRound({
  now,
  direction,
  cards,
  topicWords,
  words,
  size = QUIZ_ROUND_SIZE,
  random = Math.random,
}: TopicQuizArgs): QuizQuestion[] {
  const endOfDay = endOfStudyDay(now);
  const byCard = new Map(
    cards.filter((c) => c.kind === "vocab" && c.variant === direction).map((c) => [c.wordId, c] as const),
  );
  const priority = (w: CoreWord) => {
    const card = byCard.get(w.id);
    if (!card) return 1;
    return isDue(card, now, endOfDay) ? 0 : 2;
  };
  const ordered = shuffle([...topicWords], random).sort((a, b) => priority(a) - priority(b));

  return ordered.slice(0, size).map((word) => {
    const correct = answerText(word, direction);
    const local = pickDistractors({ target: word, pool: topicWords, direction, random });
    const missing = 3 - local.length;
    const extra =
      missing > 0
        ? pickDistractors({
            target: word,
            pool: words.filter((w) => !local.some((l) => l.id === w.id)),
            direction,
            count: missing,
            random,
          })
        : [];
    const options = shuffle([correct, ...[...local, ...extra].map((w) => answerText(w, direction))], random);
    return {
      cardId: vocabCardId(word.id, direction),
      wordId: word.id,
      direction,
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}
