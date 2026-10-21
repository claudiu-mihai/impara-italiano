import { answerText } from "../content/display.ts";
import type { CoreWord } from "../content/types.ts";
import { normalize } from "../grading/normalize.ts";
import { shuffle, type Random } from "../random.ts";
import type { Direction } from "../srs/types.ts";

const tokens = (text: string) =>
  new Set(normalize(text).split(/[^\p{L}']+/u).filter((t) => t.length > 2));

/** Două răspunsuri care au un cuvânt în comun (ex. „a lua o decizie” / „a lua masa”) se pot confunda. */
function shareToken(a: string, b: string): boolean {
  const first = tokens(a);
  for (const token of tokens(b)) if (first.has(token)) return true;
  return false;
}

export interface DistractorArgs {
  target: CoreWord;
  pool: readonly CoreWord[];
  direction: Direction;
  count?: number;
  random?: Random;
}

/**
 * Variante greșite pentru un quiz: din aceeași categorie gramaticală și cu rang apropiat,
 * fără traduceri identice între ele sau cu răspunsul corect. Dacă nu sunt destule în aceeași
 * categorie, se completează din alte categorii.
 */
export function pickDistractors({
  target,
  pool,
  direction,
  count = 3,
  random = Math.random,
}: DistractorArgs): CoreWord[] {
  const correct = answerText(target, direction);
  const valid = pool.filter(
    (w) =>
      w.id !== target.id &&
      normalize(answerText(w, direction)) !== normalize(correct) &&
      !shareToken(answerText(w, direction), correct),
  );

  const nearest = valid
    .filter((w) => w.pos === target.pos)
    .sort((a, b) => Math.abs(a.rank - target.rank) - Math.abs(b.rank - target.rank))
    .slice(0, count * 3);

  const picked: CoreWord[] = [];
  const seen = new Set([normalize(correct)]);
  const take = (candidates: readonly CoreWord[]) => {
    for (const word of candidates) {
      if (picked.length >= count) return;
      const text = normalize(answerText(word, direction));
      if (seen.has(text)) continue;
      seen.add(text);
      picked.push(word);
    }
  };

  take(shuffle(nearest, random));
  take(shuffle(valid, random));
  return picked;
}
