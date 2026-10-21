import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newStoredCard } from "../srs/scheduler.ts";
import { vocabCardId, type StoredCard } from "../srs/types.ts";
import { buildDailySession, type SessionSettings } from "./buildDailySession.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

const settings: SessionSettings = { level: "A1", newPerDay: 10, maxReviewsPerDay: 100, direction: "it-ro" };
const words = Array.from({ length: 30 }, (_, i) => ({ id: `w${i + 1}`, rank: i + 1, level: "A1" as const, pos: "verb" as const }));

function card(wordId: string, over: Partial<StoredCard> = {}): StoredCard {
  return {
    ...newStoredCard(
      { cardId: vocabCardId(wordId, "it-ro"), wordId, kind: "vocab", variant: "it-ro" },
      NOW,
      "2026-10-01",
    ),
    state: State.Review,
    due: new Date(NOW.getTime() - DAY_MS),
    ...over,
  };
}

const build = (cards: StoredCard[], over: Partial<SessionSettings> = {}, reviewsDoneToday = 0) =>
  buildDailySession({ now: NOW, settings: { ...settings, ...over }, cards, words, reviewsDoneToday });

test("fără carduri: doar cuvinte noi, în ordinea rangului, până la limita zilnică", () => {
  const queue = build([]);
  expect(queue).toHaveLength(10);
  expect(queue.every((i) => i.isNew)).toBe(true);
  expect(queue.map((i) => i.wordId)).toEqual(words.slice(0, 10).map((w) => w.id));
});

test("cuvintele deja introduse nu mai apar ca noi", () => {
  const queue = build([card("w1", { due: new Date(NOW.getTime() + 5 * DAY_MS) })]);
  expect(queue.find((i) => i.wordId === "w1")).toBeUndefined();
  expect(queue[0]?.wordId).toBe("w2");
});

test("repetițiile scadente vin primele, cele mai întârziate înainte", () => {
  const older = card("w1", { due: new Date(NOW.getTime() - 5 * DAY_MS) });
  const newer = card("w2", { due: new Date(NOW.getTime() - 1 * DAY_MS) });
  const queue = build([newer, older], { newPerDay: 0 });
  expect(queue.map((i) => i.cardId)).toEqual([older.cardId, newer.cardId]);
  expect(queue.every((i) => !i.isNew)).toBe(true);
});

test("un card nou se intercalează la fiecare 4 repetiții", () => {
  const cards = Array.from({ length: 8 }, (_, i) => card(`w${i + 1}`));
  const flags = build(cards, { newPerDay: 2 }).map((i) => (i.isNew ? "N" : "R"));
  expect(flags.join("")).toBe("RRRRNRRRRN");
});

test("un card în faza de repetare programat pentru mâine nu e scadent azi", () => {
  const tomorrow = card("w1", { due: new Date(2026, 9, 21, 12, 0) });
  expect(build([tomorrow], { newPerDay: 0 })).toHaveLength(0);
});

test("un card în faza de repetare scadent mai târziu în aceeași zi de studiu este inclus", () => {
  const laterToday = card("w1", { due: new Date(2026, 9, 20, 22, 0) });
  expect(build([laterToday], { newPerDay: 0 })).toHaveLength(1);
});

test("cardurile în învățare apar cu cel mult 20 de minute înainte de scadență", () => {
  const soon = card("w1", { state: State.Learning, due: new Date(NOW.getTime() + 10 * 60_000) });
  const later = card("w2", { state: State.Learning, due: new Date(NOW.getTime() + 60 * 60_000) });
  const queue = build([soon, later], { newPerDay: 0 });
  expect(queue.map((i) => i.wordId)).toEqual(["w1"]);
});

test("limita zilnică de repetiții ține cont de ce s-a făcut deja", () => {
  const cards = Array.from({ length: 10 }, (_, i) => card(`w${i + 1}`));
  expect(build(cards, { newPerDay: 0, maxReviewsPerDay: 6 }, 4)).toHaveLength(2);
  expect(build(cards, { newPerDay: 0, maxReviewsPerDay: 6 }, 6)).toHaveLength(0);
});

test("cardurile noi deja introduse azi se scad din limita de cuvinte noi", () => {
  const today = card("w1", { introducedOn: "2026-10-20", due: new Date(NOW.getTime() + 5 * DAY_MS) });
  const queue = build([today], { newPerDay: 3 });
  expect(queue.filter((i) => i.isNew)).toHaveLength(2);
});

test("cardurile din cealaltă direcție sunt ignorate", () => {
  const other = { ...card("w1"), variant: "ro-it", cardId: vocabCardId("w1", "ro-it") };
  const queue = build([other], { newPerDay: 1 });
  expect(queue.map((i) => i.wordId)).toEqual(["w1"]);
  expect(queue[0]?.isNew).toBe(true);
});

test("cuvintele de la un nivel mai greu decât cel curent nu se introduc", () => {
  const mixed = [
    { id: "a1", rank: 1, level: "A1" as const, pos: "noun" as const },
    { id: "a2", rank: 2, level: "A2" as const, pos: "noun" as const },
    { id: "b1", rank: 3, level: "B1" as const, pos: "noun" as const },
  ];
  const ids = (level: SessionSettings["level"]) =>
    buildDailySession({ now: NOW, settings: { ...settings, level }, cards: [], words: mixed, reviewsDoneToday: 0 }).map((i) => i.wordId);
  expect(ids("A1")).toEqual(["a1"]);
  expect(ids("A2")).toEqual(["a1", "a2"]);
  expect(ids("B1")).toEqual(["a1", "a2", "b1"]);
});

test("la un nivel mai mare se continuă cu cardurile deja începute (repetițiile nu dispar)", () => {
  const started = card("w1", { due: new Date(NOW.getTime() - DAY_MS) });
  const higherWords = [{ id: "w1", rank: 1, level: "B2" as const, pos: "noun" as const }];
  const queue = buildDailySession({ now: NOW, settings, cards: [started], words: higherWords, reviewsDoneToday: 0 });
  expect(queue.map((i) => [i.wordId, i.isNew])).toEqual([["w1", false]]);
});
