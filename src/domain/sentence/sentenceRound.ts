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
    .map((s) => toQuestion(s, sentences, random));
}

/** Întrebarea dintr-o propoziție: capcanele se aleg din `decoyPool`, iar jumătate din întrebări se dau din auz. */
function toQuestion(sentence: SentenceItem, decoyPool: readonly SentenceItem[], random: Random): SentenceQuestion {
  return {
    ...sentence,
    decoys: pickDecoys(sentence, decoyPool, decoyCount(sentence), random),
    listen: random() < LISTEN_SHARE,
  };
}

/** O temă are exercițiul „Reconstruiește propoziția” când are cel puțin atâtea propoziții. */
export const TOPIC_SENTENCE_MIN = 3;

/** Propozițiile care conțin cel puțin un cuvânt al temei. */
export function topicSentences<T extends SentenceItem>(sentences: readonly T[], topicWordIds: readonly string[]): T[] {
  const inTopic = new Set(topicWordIds);
  return sentences.filter((s) => s.wordIds.some((id) => inTopic.has(id)));
}

/**
 * Runda „Reconstruiește propoziția” dintr-o temă: întâi propozițiile cu cuvinte din temă deja începute, apoi restul
 * (fiecare grup amestecat); cel mult `size`. Capcanele vin din propozițiile aceleiași teme (ex. *martedì* printre
 * blocurile unei propoziții cu *lunedì*), care seamănă mai mult între ele decât niște cuvinte luate la întâmplare.
 */
export function buildTopicSentenceRound({
  sentences,
  topicWordIds,
  knownWordIds,
  size = SENTENCE_ROUND_SIZE,
  random = Math.random,
}: {
  sentences: readonly SentenceItem[];
  topicWordIds: readonly string[];
  knownWordIds: ReadonlySet<string>;
  size?: number;
  random?: Random;
}): SentenceQuestion[] {
  const inTopic = new Set(topicWordIds);
  const pool = topicSentences(sentences, topicWordIds);
  const started = (s: SentenceItem) => s.wordIds.some((id) => inTopic.has(id) && knownWordIds.has(id));
  return [...shuffle(pool.filter(started), random), ...shuffle(pool.filter((s) => !started(s)), random)]
    .slice(0, size)
    .map((s) => toQuestion(s, pool, random));
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
