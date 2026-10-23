import { expect, test } from "vitest";
import type { Word } from "../content/schema.ts";
import type { Mastery } from "../srs/mastery.ts";
import { browseHref, filterWords, filtersFromSearch, presentCategories } from "./filterWords.ts";

const w = (id: string, it: string, ro: string, rank: number, pos: Word["pos"] = "verb", extra: object = {}) =>
  ({ id, it, ro, rank, pos, level: "A1", tags: [], examples: [{ it: "x", ro: "y" }], ...extra }) as unknown as Word;

const words = [
  w("v-parlare", "parlare", "a vorbi", 1),
  w("v-sapere", "sapere", "a ști", 2),
  w("v-capire", "capire", "a înțelege", 3),
  w("n-libro", "libro", "carte", 4, "noun", { article: "il" }),
  w("n-amico", "amico", "prieten", 5, "noun", { article: "l'" }),
];
const all = { query: "", pos: "all", progress: "all", cefr: "all" } as const;
const none = new Map<string, Mastery>();

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

test("filtru după categorie", () => {
  expect(filterWords(words, { ...all, pos: "noun" }, none).map((x) => x.id)).toEqual(["n-libro", "n-amico"]);
  expect(filterWords(words, { ...all, pos: "verb" }, none).map((x) => x.id)).toEqual(["v-parlare", "v-sapere", "v-capire"]);
});

test("filtrele se combină cu căutarea", () => {
  expect(filterWords(words, { ...all, query: "ami", pos: "noun" }, none).map((x) => x.id)).toEqual(["n-amico"]);
  expect(filterWords(words, { ...all, query: "ami", pos: "verb" }, none)).toEqual([]);
  expect(filterWords(words, { ...all, query: "zzz" }, none)).toEqual([]);
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
  const ids = (cefr: "A" | "B" | "C" | "all") => filterWords(list, { ...all, cefr }, none).map((x) => x.id);
  expect(ids("all")).toEqual(["a", "b", "c", "d"]);
  expect(ids("A")).toEqual(["a", "b"]);
  expect(ids("B")).toEqual(["c", "d"]);
  expect(ids("C")).toEqual([]);
  // se combină cu categoria și cu căutarea
  expect(filterWords(list, { ...all, cefr: "A", pos: "verb" }, none).map((x) => x.id)).toEqual([]);
  expect(filterWords(list, { ...all, cefr: "A", query: "due" }, none).map((x) => x.id)).toEqual(["b"]);
});

test("filtru după progres (cerut din Statistici), combinabil cu categoria", () => {
  const levels = new Map<string, Mastery>([["v-parlare", "mastered"], ["v-sapere", "learning"]]);
  const ids = (progress: Mastery | "all", pos: "all" | "verb" | "noun" = "all") =>
    filterWords(words, { ...all, progress, pos }, levels).map((x) => x.id);
  expect(ids("mastered")).toEqual(["v-parlare"]);
  expect(ids("learning")).toEqual(["v-sapere"]);
  expect(ids("new")).toEqual(["v-capire", "n-libro", "n-amico"]);
  expect(ids("new", "noun")).toEqual(["n-libro", "n-amico"]);
  expect(ids("mastered", "noun")).toEqual([]);
  expect(ids("all")).toEqual(words.map((x) => x.id));
});

test("filtre din adresă: valorile cunoscute se citesc, cele necunoscute se ignoră", () => {
  const parse = (s: string) => filtersFromSearch(new URLSearchParams(s));
  expect(parse("")).toEqual({ query: "", pos: "all", progress: "all", cefr: "all" });
  expect(parse("pos=verb&progress=learning&cefr=B")).toEqual({ query: "", pos: "verb", progress: "learning", cefr: "B" });
  expect(parse("pos=cuvant&progress=gata&cefr=A1")).toEqual({ query: "", pos: "all", progress: "all", cefr: "all" });
});

test("adresa Dicționarului cu filtre: fără filtre nu are parametri, iar cele alese se pot citi înapoi", () => {
  expect(browseHref({})).toBe("/browse");
  expect(browseHref({ pos: "all", progress: "all" })).toBe("/browse");
  expect(browseHref({ pos: "noun" })).toBe("/browse?pos=noun");
  expect(browseHref({ progress: "mastered" })).toBe("/browse?progress=mastered");
  const href = browseHref({ pos: "adjective", progress: "new", cefr: "A" });
  expect(filtersFromSearch(new URL(href, "http://x").searchParams)).toMatchObject({ pos: "adjective", progress: "new", cefr: "A" });
});
