import { LEVELS, POS, type Level, type Pos } from "./constants.ts";
import type { CoreWord } from "./types.ts";

// Formatul compact al lui words.json (se încarcă la pornire, deci contează fiecare octet):
//   { "w": [[it, ro, pos, nivel, articol?], …] }
// - `pos` și `nivel` sunt indici în POS și LEVELS;
// - rangul este poziția în listă (cuvintele sunt scrise în ordinea rangului), iar id-ul se deduce din categorie și formă.

/** Prefixul id-ului pentru fiecare categorie (v-parlare, n-casa, e-che_ore_sono). */
export const ID_PREFIX: Record<Pos, string> = {
  verb: "v",
  noun: "n",
  adjective: "a",
  adverb: "adv",
  pronoun: "pr",
  preposition: "pre",
  conjunction: "c",
  numeral: "num",
  interjection: "int",
  expression: "e",
};

/** Id-ul stabil al unui cuvânt: prefixul categoriei + forma, cu spațiile înlocuite prin „_”. */
export const wordIdOf = (pos: Pos, it: string): string => `${ID_PREFIX[pos]}-${it.replaceAll(" ", "_")}`;

type Article = NonNullable<CoreWord["article"]>;
export type CompactWord = [it: string, ro: string, pos: number, level: number, article?: Article];
export interface CompactWords {
  w: CompactWord[];
}

export function encodeWords(words: readonly CoreWord[]): CompactWords {
  return {
    w: words.map((word, i): CompactWord => {
      if (word.rank !== i + 1) throw new Error(`${word.id}: rangul ${word.rank} nu este poziția ${i + 1}`);
      if (word.id !== wordIdOf(word.pos, word.it)) throw new Error(`${word.id}: id-ul nu se poate deduce din formă`);
      const pos = POS.indexOf(word.pos);
      const level = LEVELS.indexOf(word.level);
      return word.article ? [word.it, word.ro, pos, level, word.article] : [word.it, word.ro, pos, level];
    }),
  };
}

export function decodeWords(data: CompactWords): CoreWord[] {
  return data.w.map(([it, ro, pos, level, article], i): CoreWord => {
    const p: Pos = POS[pos]!;
    const l: Level = LEVELS[level]!;
    return { id: wordIdOf(p, it), it, ro, pos: p, rank: i + 1, level: l, ...(article ? { article } : {}) };
  });
}
