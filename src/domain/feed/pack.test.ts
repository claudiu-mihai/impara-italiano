import { expect, test } from "vitest";
import type { GeneratedPackItem } from "../content/schema.ts";
import { eligiblePackItems, eligiblePackQuizzes, PACK_COOLDOWN_MS, PACK_QUIZ_GAP, type FeedSeen, type PackVisit } from "./pack.ts";

const NOW = 10 * 86_400_000;
const DAY = 86_400_000;
const loc = (it: string) => ({ it, ro: it });

const item = (id: string, over: Partial<GeneratedPackItem> = {}, quiz = true) =>
  ({
    id,
    kind: "espressione",
    level: "A1",
    it: id,
    ro: id,
    explain: loc("x"),
    wordIds: [],
    ...(quiz ? { quiz: { question: loc("?"), options: ["a", "b", "c"], answer: 0 } } : {}),
    ...over,
  }) as GeneratedPackItem;

const visit = (over: Partial<PackVisit> = {}): PackVisit => ({
  visitStart: NOW - 1000,
  shownAt: new Map(),
  quizzed: new Set(),
  count: 0,
  ...over,
});

const ids = (items: readonly GeneratedPackItem[]) => items.map((i) => i.id);

test("itemii: nevăzuții întâi, apoi cei văzuți cel mai demult; cei din ultimele 3 zile ies", () => {
  const pack = [item("a"), item("b"), item("c"), item("d")];
  const seen: FeedSeen = {
    b: { shown: NOW - 5 * DAY },
    c: { shown: NOW - 2 * DAY },
    d: { shown: NOW - 4 * DAY },
  };
  expect(ids(eligiblePackItems(pack, seen, visit(), "A2", NOW))).toEqual(["a", "b", "d"]);
  expect(PACK_COOLDOWN_MS).toBe(3 * DAY);
});

test("itemii afișați în vizita curentă nu mai revin", () => {
  const pack = [item("a"), item("b")];
  expect(ids(eligiblePackItems(pack, {}, visit({ shownAt: new Map([["a", 0]]) }), "A2", NOW))).toEqual(["b"]);
});

test("itemii peste nivelul ales ies", () => {
  const pack = [item("a"), item("b", { level: "B1" })];
  expect(ids(eligiblePackItems(pack, {}, visit(), "A2", NOW))).toEqual(["a"]);
});

test("testele: doar itemi cu test", () => {
  const pack = [item("a", {}, false), item("b")];
  const seen: FeedSeen = { a: { shown: NOW - 5 * DAY }, b: { shown: NOW - 5 * DAY } };
  expect(ids(eligiblePackQuizzes(pack, seen, visit(), "A2", NOW))).toEqual(["b"]);
});

test("testele: un item nevăzut niciodată nu are test", () => {
  expect(eligiblePackQuizzes([item("a")], {}, visit(), "A2", NOW)).toEqual([]);
});

test("testele: item văzut într-o vizită anterioară și netestat de 3 zile intră; testat de curând nu", () => {
  const pack = [item("a"), item("b"), item("c")];
  const seen: FeedSeen = {
    a: { shown: NOW - 5 * DAY },
    b: { shown: NOW - 5 * DAY, quizzed: NOW - 1 * DAY },
    c: { shown: NOW - 5 * DAY, quizzed: NOW - 4 * DAY },
  };
  expect(ids(eligiblePackQuizzes(pack, seen, visit(), "A2", NOW))).toEqual(["a", "c"]);
});

test("testele: item afișat în vizită trebuie să aștepte PACK_QUIZ_GAP carduri", () => {
  const pack = [item("a")];
  const seen: FeedSeen = { a: { shown: NOW } };
  const shownAt = new Map([["a", 5]]);
  expect(PACK_QUIZ_GAP).toBe(10);
  expect(eligiblePackQuizzes(pack, seen, visit({ shownAt, count: 14 }), "A2", NOW)).toEqual([]);
  expect(ids(eligiblePackQuizzes(pack, seen, visit({ shownAt, count: 15 }), "A2", NOW))).toEqual(["a"]);
});

test("testele: itemul testat deja în vizită nu mai are test", () => {
  const pack = [item("a")];
  const seen: FeedSeen = { a: { shown: NOW - 5 * DAY } };
  expect(eligiblePackQuizzes(pack, seen, visit({ quizzed: new Set(["a"]) }), "A2", NOW)).toEqual([]);
});

test("un idiom B2 nu apare la nivelul B1, apare la B2", () => {
  const modoB2 = item("modo-x", { kind: "modo-di-dire", level: "B2", literal: "x", match: "different" } as Partial<GeneratedPackItem>);
  expect(eligiblePackItems([modoB2], {}, visit(), "B1", NOW)).toEqual([]);
  expect(ids(eligiblePackItems([modoB2], {}, visit(), "B2", NOW))).toEqual(["modo-x"]);
});
