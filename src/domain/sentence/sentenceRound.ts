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

/** O întrebare dintr-o rundă: propoziția, blocurile-capcană și dacă se dă din auz. */
export interface SentenceQuestion extends SentenceItem {
  /** Cuvinte din alte propoziții, amestecate printre blocuri; nu fac parte niciodată din răspuns. Indicii lor urmează după cei ai `tokens`. */
  decoys: string[];
  /** „Din auz”: se aude propoziția, iar traducerea nu se arată înainte de răspuns. */
  listen: boolean;
}

export const SENTENCE_ROUND_SIZE = 8;
const LISTEN_SHARE = 0.5;

/** Câte capcane primește o propoziție: una la cele de 3 blocuri, două la celelalte. */
const decoyCount = (sentence: SentenceItem) => (sentence.tokens.length <= 3 ? 1 : 2);

/**
 * Până la `count` blocuri din alte propoziții, care nu apar (după text) în aceasta și nu se repetă între ele.
 * Blocurile cu virgulă sau alt semn la capăt sunt sărite: ar arăta dintr-o privire că nu aparțin.
 */
export function pickDecoys(
  sentence: SentenceItem,
  pool: readonly SentenceItem[],
  count: number,
  random: Random = Math.random,
): string[] {
  const taken = new Set(sentence.tokens.map((t) => t.toLowerCase()));
  const candidates: string[] = [];
  for (const other of pool) {
    if (other.id === sentence.id) continue;
    for (const token of other.tokens) {
      const key = token.toLowerCase();
      if (taken.has(key) || /[,;:]$/.test(token)) continue;
      taken.add(key);
      candidates.push(token);
    }
  }
  return shuffle(candidates, random).slice(0, count);
}

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
}): SentenceQuestion[] {
  const eligible = sentences.filter((s) => s.wordIds.some((id) => knownWordIds.has(id)));
  return shuffle(eligible, random)
    .slice(0, size)
    .map((s) => ({
      ...s,
      decoys: pickDecoys(s, sentences, decoyCount(s), random),
      listen: random() < LISTEN_SHARE,
    }));
}

const keyOf = (sentence: SentenceItem, order: readonly number[]) =>
  order.map((i) => sentence.tokens[i]!.toLowerCase()).join(" ");

/** Corect dacă ordinea aleasă dă aceleași cuvinte ca oricare dintre ordinile acceptate (fără a conta majusculele). Orice capcană o strică. */
export function isCorrectArrangement(sentence: SentenceItem, arrangement: readonly number[]): boolean {
  if (arrangement.length !== sentence.tokens.length) return false;
  if (arrangement.some((i) => i >= sentence.tokens.length)) return false;
  const given = keyOf(sentence, arrangement);
  return sentence.acceptedOrders.some((order) => keyOf(sentence, order) === given);
}

/** Ordinea în care apar blocurile pe ecran: amestecată și diferită de cele acceptate. */
export function scrambleOrder(sentence: SentenceItem & { decoys?: readonly string[] }, random: Random = Math.random): number[] {
  const indices = [...sentence.tokens, ...(sentence.decoys ?? [])].map((_, i) => i);
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
