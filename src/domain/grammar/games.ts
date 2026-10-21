import type { GrammarItem } from "../content/schema.ts";
import { compareAnswer, type AnswerResult } from "../grading/compareAnswer.ts";
import { shuffle, type Random } from "../random.ts";

/** Câte exemple are o sesiune de joc. */
export const GRAMMAR_SESSION_SIZE = 10;

/** Câte perechi are o rundă „Potrivire”. */
export const GRAMMAR_PAIRS_PER_ROUND = 5;

/** Exemplele unei sesiuni: o selecție amestecată din tema aleasă. */
export function pickSession(items: readonly GrammarItem[], random: Random = Math.random): GrammarItem[] {
  return shuffle(items, random).slice(0, GRAMMAR_SESSION_SIZE);
}

export interface GrammarPair {
  id: string;
  it: string;
  ro: string;
}

/** Rundele pentru „Potrivire”: expresia italiană ↔ traducerea ei, în grupuri de câte 5 din sesiune. */
export function buildGrammarMatchRounds(items: readonly GrammarItem[], random: Random = Math.random): GrammarPair[][] {
  const pairs = pickSession(items, random).map(({ id, it, ro }): GrammarPair => ({ id, it, ro }));
  const rounds: GrammarPair[][] = [];
  for (let i = 0; i < pairs.length; i += GRAMMAR_PAIRS_PER_ROUND) {
    rounds.push(pairs.slice(i, i + GRAMMAR_PAIRS_PER_ROUND));
  }
  return rounds;
}

/**
 * Corectează răspunsul scris. Spre deosebire de conjugări, o greșeală de accent nu trece:
 * în gramatică „e” (și) și „è” (este) sunt cuvinte diferite.
 */
export function gradeGap(input: string, item: Pick<GrammarItem, "gap">): AnswerResult {
  return compareAnswer(input, [item.gap]);
}
