import { expect, test } from "vitest";
import type { Word } from "../content/schema.ts";
import type { Mastery } from "../srs/mastery.ts";
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
const none = new Map<string, Mastery>();
const all = { query: "", pos: "all", progress: "all", cefr: [] } as const;

test("fără filtre se întorc toate cuvintele, după rang", () => {
  expect(filterWords(words, all, none).map((x) => x.id)).toEqual(words.map((x) => x.id));
});

test("căutare după italiană și română, fără a conta diacriticele", () => {
  const ids = (query: string) => filterWords(words, { ...all, query }, none).map((x) => x.id);
  expect(ids("parl")).toEqual(["v-parlare"]);
  expect(ids("vorbi")).toEqual(["v-parlare"]);
  expect(ids("sti")).toEqual(["v-sapere"]); // „ști” fără diacritice
  expect(ids("ÎNȚELEGE")).toEqual(["v-capire"]);
  expect(ids("intelege")).toEqual(["v-capire"]);
});

test("căutarea găsește substantivele și după articol", () => {
  const ids = (query: string) => filterWords(words, { ...all, query }, none).map((x) => x.id);
  expect(ids("l'amico")).toEqual(["n-amico"]);
  expect(ids("il libro")).toEqual(["n-libro"]);
});

test("potrivirile de început apar înaintea celorlalte", () => {
  const list = [w("a", "capire", "a înțelege", 1), w("b", "pare", "a sta", 2), w("c", "parlare", "a spune", 3)];
  const ids = filterWords(list, { ...all, query: "par" }, none).map((x) => x.id);
  expect(ids).toEqual(["b", "c"]);
  const mid = [w("x", "separa", "desparte", 1), w("y", "parola", "cuvânt", 2)];
  expect(filterWords(mid, { ...all, query: "par" }, none).map((x) => x.id)).toEqual(["y", "x"]);
});

test("filtre după categorie și după nivel", () => {
  expect(filterWords(words, { ...all, pos: "noun" }, none).map((x) => x.id)).toEqual(["n-libro", "n-amico"]);

  const levels = new Map<string, Mastery>([["v-parlare", "mastered"], ["v-sapere", "learning"]]);
  const ids = (level: Mastery) => filterWords(words, { ...all, progress: level }, levels).map((x) => x.id);
  expect(ids("mastered")).toEqual(["v-parlare"]);
  expect(ids("learning")).toEqual(["v-sapere"]);
  expect(ids("new")).toEqual(["v-capire", "n-libro", "n-amico"]);
});

test("filtrele se combină cu căutarea", () => {
  expect(filterWords(words, { ...all, query: "ami", pos: "noun" }, none).map((x) => x.id)).toEqual(["n-amico"]);
  expect(filterWords(words, { ...all, query: "ami", pos: "verb" }, none)).toEqual([]);
  expect(filterWords(words, { ...all, query: "zzz" }, none)).toEqual([]);
});

test("categoriile prezente", () => {
  expect(presentCategories(words)).toEqual(["verb", "noun"]);
});

test("filtru după grupele de niveluri CEFR (A, B, C): fără grupă alese înseamnă toate, grupele se combină", () => {
  const list = [
    w("a", "uno", "unu", 1, "numeral", { level: "A1" }),
    w("b", "due", "doi", 2, "numeral", { level: "A2" }),
    w("c", "tre", "trei", 3, "numeral", { level: "B1" }),
    w("d", "quattro", "patru", 4, "numeral", { level: "B2" }),
  ];
  const ids = (cefr: ("A" | "B" | "C")[], progress: Mastery | "all" = "all", m = none) =>
    filterWords(list, { ...all, cefr, progress }, m).map((x) => x.id);
  expect(ids([])).toEqual(["a", "b", "c", "d"]);
  expect(ids(["A"])).toEqual(["a", "b"]);
  expect(ids(["B"])).toEqual(["c", "d"]);
  expect(ids(["C"])).toEqual([]);
  expect(ids(["A", "B"])).toEqual(["a", "b", "c", "d"]);
  expect(ids(["B", "C"])).toEqual(["c", "d"]);
  expect(ids(["A"], "learning", new Map<string, Mastery>([["b", "learning"]]))).toEqual(["b"]);
});
