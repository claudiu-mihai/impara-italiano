import { expect, test } from "vitest";
import type { Level, Pos } from "../content/constants.ts";
import { orderNewWords } from "./orderNewWords.ts";

const w = (id: string, rank: number, pos: Pos, level: Level = "A1") => ({ id, rank, pos, level });

test("un cuvânt gramatical la fiecare 3 cuvinte de conținut, în ordinea frecvenței", () => {
  const words = [
    w("e", 1, "conjunction"),
    w("essere", 2, "verb"),
    w("di", 3, "preposition"),
    w("avere", 4, "verb"),
    w("casa", 5, "noun"),
    w("fare", 6, "verb"),
    w("che", 7, "conjunction"),
    w("tempo", 8, "noun"),
  ];
  expect(orderNewWords(words).map((x) => x.id)).toEqual(["essere", "avere", "casa", "e", "fare", "tempo", "di", "che"]);
});

test("nivelurile mai ușoare vin primele, chiar dacă un cuvânt de nivel mai greu e mai frecvent", () => {
  const words = [w("b", 1, "noun", "A2"), w("a", 50, "noun", "A1"), w("c", 2, "verb", "A2")];
  expect(orderNewWords(words).map((x) => x.id)).toEqual(["a", "b", "c"]);
});

test("rămâne o ordine completă când un tip de cuvinte se termină", () => {
  const onlyGrammar = [w("e", 1, "conjunction"), w("di", 2, "preposition")];
  expect(orderNewWords(onlyGrammar).map((x) => x.id)).toEqual(["e", "di"]);
  expect(orderNewWords([])).toEqual([]);
});

test("nu modifică lista primită", () => {
  const words = [w("b", 2, "verb"), w("a", 1, "verb")];
  orderNewWords(words);
  expect(words.map((x) => x.id)).toEqual(["b", "a"]);
});
