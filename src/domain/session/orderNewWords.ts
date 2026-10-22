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
 * Amestecă substantivele cu restul cuvintelor de conținut (ambele deja ordonate după frecvență) astfel încât
 * `nounShare` la sută din cuvinte să fie substantive, începând cu cel mai frecvent. Când un grup se termină, rămâne celălalt.
 */
function withNounShare<T extends Orderable>(content: readonly T[], nounShare: number): T[] {
  const nouns = content.filter((w) => w.pos === "noun");
  const others = content.filter((w) => w.pos !== "noun");
  const mixed: T[] = [];
  let n = 0;
  let o = 0;
  for (let i = 0; n < nouns.length || o < others.length; i++) {
    // pe poziția i vine un substantiv de fiecare dată când numărul rotunjit de substantive cuvenite crește
    const due = Math.round(((i + 1) * nounShare) / 100) > Math.round((i * nounShare) / 100);
    const takeNoun = n < nouns.length && (due || o >= others.length);
    mixed.push(takeNoun ? nouns[n++]! : others[o++]!);
  }
  return mixed;
}

/**
 * Ordinea în care se introduc cuvintele noi: nivelurile mai ușoare întâi, iar în fiecare nivel după frecvență,
 * cu un cuvânt gramatical la fiecare CONTENT_PER_FUNCTION cuvinte de conținut (altfel primele cărți ar fi „e, di, che”).
 * Cu `nounShare` > 0, substantivele ocupă acel procent din cuvintele de conținut (tot după frecvență, doar mai devreme).
 */
export function orderNewWords<T extends Orderable>(words: readonly T[], nounShare = 0): T[] {
  const byRank = (a: T, b: T) => a.rank - b.rank;
  const levels = [...new Set(words.map((w) => w.level))].sort((a, b) => levelIndex(a) - levelIndex(b));

  return levels.flatMap((level) => {
    const inLevel = words.filter((w) => w.level === level);
    const byFrequency = inLevel.filter((w) => !FUNCTION_POS.includes(w.pos)).sort(byRank);
    const content = nounShare > 0 ? withNounShare(byFrequency, nounShare) : byFrequency;
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
