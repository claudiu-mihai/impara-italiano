import { italianText } from "../content/display.ts";
import { POS, type Pos } from "../content/constants.ts";
import { levelGroupOf, LEVEL_GROUPS, type LevelGroup } from "../content/levels.ts";
import type { CoreWord } from "../content/types.ts";
import { normalize, stripAccents } from "../grading/normalize.ts";
import type { Mastery } from "../srs/mastery.ts";

export interface BrowseFilters {
  query: string;
  pos: Pos | "all";
  /**
   * Progresul personal la acel cuvânt (nou, în învățare, stăpânit). Nu are selector în Dicționar: se setează din link
   * (Statistici) și se arată ca un chip care se poate închide.
   */
  progress: Mastery | "all";
  /** Grupa de niveluri CEFR aleasă: A (A1–A2), B (B1–B2) sau C (C1–C2); „all” = toate nivelurile. */
  cefr: LevelGroup | "all";
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
    if (cefr !== "all" && levelGroupOf(word.level) !== cefr) return [];
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

const PROGRESS_VALUES: readonly Mastery[] = ["new", "learning", "mastered"];

export const NO_FILTERS: BrowseFilters = { query: "", pos: "all", progress: "all", cefr: "all" };

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | "all" =>
  allowed.find((a) => a === value) ?? "all";

/** Filtrele cerute prin adresă (`/browse?pos=verb&progress=learning&cefr=A`); valorile necunoscute sunt ignorate. */
export function filtersFromSearch(params: URLSearchParams): BrowseFilters {
  return {
    query: "",
    pos: pick(params.get("pos"), POS),
    progress: pick(params.get("progress"), PROGRESS_VALUES),
    cefr: pick(params.get("cefr"), LEVEL_GROUPS),
  };
}

/** Adresa Dicționarului cu filtrele date aplicate (cele lipsă sau „all” nu apar în adresă). */
export function browseHref(filters: Partial<Pick<BrowseFilters, "pos" | "progress" | "cefr">>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value && value !== "all") params.set(key, value);
  const search = params.toString();
  return search ? `/browse?${search}` : "/browse";
}

/** Categoriile prezente în dicționar, în ordinea în care apar. */
export function presentCategories(words: readonly CoreWord[]): Pos[] {
  return [...new Set(words.map((w) => w.pos))];
}
