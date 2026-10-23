import { answerText } from "../content/display.ts";
import type { CoreWord } from "../content/types.ts";
import { shuffle, type Random } from "../random.ts";
import { directionsOf, isDue } from "../session/buildDailySession.ts";
import type { StudyDirection } from "../settings.ts";
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
  /** În modul „ambele”, fiecare întrebare e în direcția cardului ei. */
  direction: StudyDirection;
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

  const { active } = directionsOf(direction);
  const vocab = cards.filter((c) => c.kind === "vocab" && active.includes(c.variant as Direction) && byId.has(c.wordId));
  const due = vocab
    .filter((c) => isDue(c, now, endOfDay))
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  const dueIds = new Set(due.map((c) => c.cardId));
  const rest = vocab.filter((c) => !dueIds.has(c.cardId)).sort((a, b) => a.stability - b.stability);

  return [...due, ...rest].slice(0, size).map((card) => {
    const word = byId.get(card.wordId)!;
    const asked = card.variant as Direction;
    const correct = answerText(word, asked);
    const wrong = pickDistractors({ target: word, pool: words, direction: asked, random }).map((w) =>
      answerText(w, asked),
    );
    const options = shuffle([correct, ...wrong], random);
    return {
      cardId: card.cardId,
      wordId: word.id,
      direction: asked,
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}

export interface TopicQuizArgs {
  now: Date;
  direction: StudyDirection;
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
  const { active, forNewWords } = directionsOf(direction);
  const byWord = new Map<string, StoredCard[]>();
  for (const c of cards) {
    if (c.kind !== "vocab" || !active.includes(c.variant as Direction)) continue;
    byWord.set(c.wordId, [...(byWord.get(c.wordId) ?? []), c]);
  }
  // cardul întrebat: cel scadent, altfel unul dintre cele existente; fără card, direcția cuvintelor noi
  const cardFor = (w: CoreWord) => {
    const list = byWord.get(w.id) ?? [];
    return list.find((c) => isDue(c, now, endOfDay)) ?? list[Math.floor(random() * list.length)];
  };
  const chosen = new Map(topicWords.map((w) => [w.id, cardFor(w)] as const));
  const priority = (w: CoreWord) => {
    const card = chosen.get(w.id);
    if (!card) return 1;
    return isDue(card, now, endOfDay) ? 0 : 2;
  };
  const ordered = shuffle([...topicWords], random).sort((a, b) => priority(a) - priority(b));

  return ordered.slice(0, size).map((word) => {
    const asked = (chosen.get(word.id)?.variant as Direction | undefined) ?? forNewWords;
    const correct = answerText(word, asked);
    const local = pickDistractors({ target: word, pool: topicWords, direction: asked, random });
    const missing = 3 - local.length;
    const extra =
      missing > 0
        ? pickDistractors({
            target: word,
            pool: words.filter((w) => !local.some((l) => l.id === w.id)),
            direction: asked,
            count: missing,
            random,
          })
        : [];
    const options = shuffle([correct, ...[...local, ...extra].map((w) => answerText(w, asked))], random);
    return {
      cardId: vocabCardId(word.id, asked),
      wordId: word.id,
      direction: asked,
      options,
      correctIndex: options.indexOf(correct),
    };
  });
}
