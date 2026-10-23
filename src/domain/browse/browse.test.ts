import { expect, test } from "vitest";
import type { Word } from "../content/schema.ts";
import { filterWords, presentCategories } from "./filterWords.ts";

const w = (id: string, it: string, ro: string, rank: number, pos: Word["pos"] = "verb", extra: object = {}) =>
  ({ id, it, ro, rank, pos, level: "A1", tags: [], examples: [{ it: "x", ro: "y" }], ...extra }) as unknown as Word;

const words = [
  w("v-parlare", "parlare", "a vorbi", 1),
  w("v-sapere", "sapere", "a ști", 2),
  w("v-capire", "capire", "a înțelege", 3),
  w("n-libro", "libro", "carte", 4, "noun", { article: "il" }),
  w("n-amico", "amico", "prieten", 5, "noun", { article: "l'" }),
];
const all = { query: "", pos: "all", cefr: "all" } as const;

test("fără filtre se întorc toate cuvintele, după rang", () => {
  expect(filterWords(words, all).map((x) => x.id)).toEqual(words.map((x) => x.id));
});

test("căutare după italiană și română, fără a conta diacriticele", () => {
  const ids = (query: string) => filterWords(words, { ...all, query }).map((x) => x.id);
  expect(ids("parl")).toEqual(["v-parlare"]);
  expect(ids("vorbi")).toEqual(["v-parlare"]);
  expect(ids("sti")).toEqual(["v-sapere"]); // „ști” fără diacritice
  expect(ids("ÎNȚELEGE")).toEqual(["v-capire"]);
  expect(ids("intelege")).toEqual(["v-capire"]);
});

test("căutarea găsește substantivele și după articol", () => {
  const ids = (query: string) => filterWords(words, { ...all, query }).map((x) => x.id);
  expect(ids("l'amico")).toEqual(["n-amico"]);
  expect(ids("il libro")).toEqual(["n-libro"]);
});

test("potrivirile de început apar înaintea celorlalte", () => {
  const list = [w("a", "capire", "a înțelege", 1), w("b", "pare", "a sta", 2), w("c", "parlare", "a spune", 3)];
  const ids = filterWords(list, { ...all, query: "par" }).map((x) => x.id);
  expect(ids).toEqual(["b", "c"]);
  const mid = [w("x", "separa", "desparte", 1), w("y", "parola", "cuvânt", 2)];
  expect(filterWords(mid, { ...all, query: "par" }).map((x) => x.id)).toEqual(["y", "x"]);
});

test("filtru după categorie", () => {
  expect(filterWords(words, { ...all, pos: "noun" }).map((x) => x.id)).toEqual(["n-libro", "n-amico"]);
  expect(filterWords(words, { ...all, pos: "verb" }).map((x) => x.id)).toEqual(["v-parlare", "v-sapere", "v-capire"]);
});

test("filtrele se combină cu căutarea", () => {
  expect(filterWords(words, { ...all, query: "ami", pos: "noun" }).map((x) => x.id)).toEqual(["n-amico"]);
  expect(filterWords(words, { ...all, query: "ami", pos: "verb" })).toEqual([]);
  expect(filterWords(words, { ...all, query: "zzz" })).toEqual([]);
});

test("categoriile prezente", () => {
  expect(presentCategories(words)).toEqual(["verb", "noun"]);
});

test("filtru după grupa de niveluri CEFR (A, B, C); „all” arată toate nivelurile", () => {
  const list = [
    w("a", "uno", "unu", 1, "numeral", { level: "A1" }),
    w("b", "due", "doi", 2, "numeral", { level: "A2" }),
    w("c", "tre", "trei", 3, "numeral", { level: "B1" }),
    w("d", "quattro", "patru", 4, "numeral", { level: "B2" }),
  ];
  const ids = (cefr: "A" | "B" | "C" | "all") => filterWords(list, { ...all, cefr }).map((x) => x.id);
  expect(ids("all")).toEqual(["a", "b", "c", "d"]);
  expect(ids("A")).toEqual(["a", "b"]);
  expect(ids("B")).toEqual(["c", "d"]);
  expect(ids("C")).toEqual([]);
  // se combină cu categoria și cu căutarea
  expect(filterWords(list, { ...all, cefr: "A", pos: "verb" }).map((x) => x.id)).toEqual([]);
  expect(filterWords(list, { ...all, cefr: "A", query: "due" }).map((x) => x.id)).toEqual(["b"]);
});
