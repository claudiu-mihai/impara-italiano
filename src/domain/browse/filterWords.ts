import { italianText } from "../content/display.ts";
import type { Level, Pos } from "../content/constants.ts";
import type { CoreWord } from "../content/types.ts";
import { normalize, stripAccents } from "../grading/normalize.ts";
import type { Mastery } from "../srs/mastery.ts";

export interface BrowseFilters {
  query: string;
  pos: Pos | "all";
  /** Progresul personal la acel cuvânt: nou, în învățare, stăpânit. */
  progress: Mastery | "all";
  /** Nivelul CEFR al cuvântului. */
  cefr: Level | "all";
}

/** Text de căutare: minuscule și fără diacritice (ă → a, ș → s, è → e), ca „ști” să se găsească cu „sti”. */
const searchKey = (text: string) => stripAccents(normalize(text));

/** Cuvintele care se potrivesc căutării și filtrelor; cele care încep cu textul căutat apar primele, apoi după rang. */
export function filterWords(
  words: readonly CoreWord[],
  { query, pos, progress, cefr }: BrowseFilters,
  levels: ReadonlyMap<string, Mastery>,
): CoreWord[] {
  const needle = searchKey(query);

  const rows = words.flatMap((word) => {
    if (pos !== "all" && word.pos !== pos) return [];
    if (cefr !== "all" && word.level !== cefr) return [];
    if (progress !== "all" && (levels.get(word.id) ?? "new") !== progress) return [];
    if (!needle) return [{ word, prefix: false }];

    const fields = [word.it, italianText(word), word.ro].map(searchKey);
    if (!fields.some((f) => f.includes(needle))) return [];
    // „a vorbi” trebuie să se găsească și cu „vorbi”: potrivirea de început se verifică și pe cuvinte.
    const prefix = fields.some((f) => f.split(/[\s']+/).some((part) => part.startsWith(needle)));
    return [{ word, prefix }];
  });

  return rows
    .sort((a, b) => Number(b.prefix) - Number(a.prefix) || a.word.rank - b.word.rank)
    .map((row) => row.word);
}

/** Categoriile prezente în dicționar, în ordinea în care apar. */
export function presentCategories(words: readonly CoreWord[]): Pos[] {
  return [...new Set(words.map((w) => w.pos))];
}
