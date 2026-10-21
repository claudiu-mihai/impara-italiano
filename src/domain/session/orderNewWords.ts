import type { Level, Pos } from "../content/constants.ts";
import { levelIndex } from "../content/levels.ts";

/** Cuvinte gramaticale: utile, dar abstracte; se introduc rar, printre cuvinte de conținut. */
export const FUNCTION_POS: readonly Pos[] = ["pronoun", "preposition", "conjunction"];

/** Câte cuvinte de conținut (verbe, substantive, adjective, adverbe...) vin între două cuvinte gramaticale. */
export const CONTENT_PER_FUNCTION = 3;

interface Orderable {
  rank: number;
  level: Level;
  pos: Pos;
}

/**
 * Ordinea în care se introduc cuvintele noi: nivelurile mai ușoare întâi, iar în fiecare nivel după frecvență,
 * cu un cuvânt gramatical la fiecare CONTENT_PER_FUNCTION cuvinte de conținut (altfel primele cărți ar fi „e, di, che”).
 */
export function orderNewWords<T extends Orderable>(words: readonly T[]): T[] {
  const byRank = (a: T, b: T) => a.rank - b.rank;
  const levels = [...new Set(words.map((w) => w.level))].sort((a, b) => levelIndex(a) - levelIndex(b));

  return levels.flatMap((level) => {
    const inLevel = words.filter((w) => w.level === level);
    const content = inLevel.filter((w) => !FUNCTION_POS.includes(w.pos)).sort(byRank);
    const grammar = inLevel.filter((w) => FUNCTION_POS.includes(w.pos)).sort(byRank);

    const mixed: T[] = [];
    let c = 0;
    let g = 0;
    while (c < content.length || g < grammar.length) {
      for (let k = 0; k < CONTENT_PER_FUNCTION && c < content.length; k++) mixed.push(content[c++]!);
      if (g < grammar.length) mixed.push(grammar[g++]!);
    }
    return mixed;
  });
}
