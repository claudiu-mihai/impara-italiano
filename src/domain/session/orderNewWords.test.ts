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

const mixedWords = [
  ...Array.from({ length: 10 }, (_, i) => w(`v${i}`, 2 * i + 1, "verb")),
  ...Array.from({ length: 10 }, (_, i) => w(`n${i}`, 2 * i + 100, "noun")),
];
const nounsIn = (ids: string[]) => ids.filter((id) => id.startsWith("n")).length;

test("procent de substantive 0: aceeași ordine ca înainte", () => {
  const ids = orderNewWords(mixedWords, 0).map((x) => x.id);
  expect(ids).toEqual(orderNewWords(mixedWords).map((x) => x.id));
  expect(ids.slice(0, 10)).toEqual(Array.from({ length: 10 }, (_, i) => `v${i}`));
});

test("1 din 2: substantivele alternează cu restul, începând cu cel mai frecvent", () => {
  const ids = orderNewWords(mixedWords, 50).map((x) => x.id);
  expect(ids.slice(0, 6)).toEqual(["n0", "v0", "n1", "v1", "n2", "v2"]);
  expect(nounsIn(ids.slice(0, 10))).toBe(5);
});

test("1 din 3 și 2 din 3: raportul se respectă pe orice fereastră de 6 cuvinte", () => {
  for (const [share, expected] of [[33, 2], [67, 4]] as const) {
    const ids = orderNewWords(mixedWords, share).map((x) => x.id);
    for (let start = 0; start + 6 <= 12; start += 6) expect(nounsIn(ids.slice(start, start + 6)), `${share}%`).toBe(expected);
  }
});

test("în fiecare grup rămâne ordinea frecvenței, nu se pierde și nu se dublează niciun cuvânt", () => {
  const ids = orderNewWords(mixedWords, 67).map((x) => x.id);
  expect(new Set(ids).size).toBe(mixedWords.length);
  expect(ids.filter((id) => id.startsWith("n"))).toEqual(Array.from({ length: 10 }, (_, i) => `n${i}`));
  expect(ids.filter((id) => id.startsWith("v"))).toEqual(Array.from({ length: 10 }, (_, i) => `v${i}`));
});

test("când substantivele se termină (sau nu există), continuă restul", () => {
  const fewNouns = [w("n0", 1, "noun"), ...Array.from({ length: 4 }, (_, i) => w(`v${i}`, i + 2, "verb"))];
  expect(orderNewWords(fewNouns, 67).map((x) => x.id)).toEqual(["n0", "v0", "v1", "v2", "v3"]);
  const noNouns = Array.from({ length: 3 }, (_, i) => w(`v${i}`, i + 1, "verb"));
  expect(orderNewWords(noNouns, 50).map((x) => x.id)).toEqual(["v0", "v1", "v2"]);
});

test("nivelul rămâne criteriul principal și cuvintele gramaticale se intercalează ca înainte", () => {
  const words = [
    w("b-noun", 1, "noun", "A2"),
    w("a-verb", 9, "verb", "A1"),
    w("a-noun", 10, "noun", "A1"),
    w("a-noun2", 11, "noun", "A1"),
    w("a-noun3", 12, "noun", "A1"),
    w("a-prep", 2, "preposition", "A1"),
  ];
  expect(orderNewWords(words, 67).map((x) => x.id)).toEqual(["a-noun", "a-verb", "a-noun2", "a-prep", "a-noun3", "b-noun"]);
});
