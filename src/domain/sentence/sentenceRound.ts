import { shuffle, type Random } from "../random.ts";

/** Forma unei propoziții pentru exercițiu (vezi `sentenceSchema`). */
export interface SentenceItem {
  id: string;
  wordIds: string[];
  it: string;
  ro: string;
  tokens: string[];
  punctuation: string;
  acceptedOrders: number[][];
}

export const SENTENCE_ROUND_SIZE = 8;

/** Propozițiile care conțin cel puțin un cuvânt deja introdus, amestecate; cel mult `size`. */
export function buildSentenceRound({
  sentences,
  knownWordIds,
  size = SENTENCE_ROUND_SIZE,
  random = Math.random,
}: {
  sentences: readonly SentenceItem[];
  knownWordIds: ReadonlySet<string>;
  size?: number;
  random?: Random;
}): SentenceItem[] {
  const eligible = sentences.filter((s) => s.wordIds.some((id) => knownWordIds.has(id)));
  return shuffle(eligible, random).slice(0, size);
}

const keyOf = (sentence: SentenceItem, order: readonly number[]) =>
  order.map((i) => sentence.tokens[i]!.toLowerCase()).join(" ");

/** Corect dacă ordinea aleasă dă aceleași cuvinte ca oricare dintre ordinile acceptate (fără a conta majusculele). */
export function isCorrectArrangement(sentence: SentenceItem, arrangement: readonly number[]): boolean {
  if (arrangement.length !== sentence.tokens.length) return false;
  const given = keyOf(sentence, arrangement);
  return sentence.acceptedOrders.some((order) => keyOf(sentence, order) === given);
}

/** Ordinea în care apar blocurile pe ecran: amestecată și diferită de cele acceptate. */
export function scrambleOrder(sentence: SentenceItem, random: Random = Math.random): number[] {
  const indices = sentence.tokens.map((_, i) => i);
  let attempt = shuffle(indices, random);
  for (let tries = 0; tries < 20 && isCorrectArrangement(sentence, attempt); tries++) {
    attempt = shuffle(indices, random);
  }
  return attempt;
}

/** Textul propoziției scrise corect, cu prima literă mare și punctuația fixă. */
export function sentenceText(sentence: SentenceItem, order: readonly number[] = sentence.acceptedOrders[0]!): string {
  const words = order.map((i) => sentence.tokens[i]!);
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1) + sentence.punctuation;
}
