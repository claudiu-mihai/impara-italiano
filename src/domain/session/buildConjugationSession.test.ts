import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newStoredCard } from "../srs/scheduler.ts";
import { conjCardId, vocabCardId, type StoredCard } from "../srs/types.ts";
import { unlockedTenses } from "../srs/unlock.ts";
import { buildConjugationSession, type ConjVerb } from "./buildConjugationSession.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

const verbs: ConjVerb[] = [
  { id: "v-a", rank: 1, level: "A1", tenses: ["presente", "passatoProssimo"] },
  { id: "v-b", rank: 2, level: "A1", tenses: ["presente", "passatoProssimo"] },
];
const settings = { level: "A1" as const, newConjPerDay: 3, maxReviewsPerDay: 100 };

const vocab = (wordId: string, state: State): StoredCard => ({
  ...newStoredCard({ cardId: vocabCardId(wordId, "it-ro"), wordId, kind: "vocab", variant: "it-ro" }, NOW, "2026-10-01"),
  state,
  due: new Date(NOW.getTime() + 9 * DAY),
});

const conj = (verbId: string, tense: string, over: Partial<StoredCard> = {}): StoredCard => ({
  ...newStoredCard({ cardId: conjCardId(verbId, tense), wordId: verbId, kind: "conj", variant: tense }, NOW, "2026-10-01"),
  state: State.Review,
  due: new Date(NOW.getTime() + 9 * DAY),
  stability: 5,
  ...over,
});

const build = (cards: StoredCard[], over = {}, reviewsDoneToday = 0) =>
  buildConjugationSession({ now: NOW, settings: { ...settings, ...over }, cards, verbs, reviewsDoneToday });

test("conjugarea unui verb nu apare până nu iese din învățare la vocabular", () => {
  expect(build([])).toEqual([]);
  expect(build([vocab("v-a", State.Learning)])).toEqual([]);
  expect(build([vocab("v-a", State.New)])).toEqual([]);
});

test("după ce vocabularul a trecut în repetare apare doar primul timp", () => {
  const queue = build([vocab("v-a", State.Review)]);
  expect(queue).toEqual([{ cardId: "conj:v-a:presente", verbId: "v-a", tense: "presente", isNew: true }]);
});

test("al doilea timp se deblochează când primul e învățat (stabilitate ≥ 7 zile)", () => {
  const base = vocab("v-a", State.Review);
  const available = ["presente", "passatoProssimo"] as const;
  const unlocked = (stability: number) =>
    unlockedTenses({
      verbLevel: "A1",
      currentLevel: "A1",
      vocabCards: [base],
      conjCards: [conj("v-a", "presente", { stability })],
      available,
    });

  expect(unlocked(6.9)).toEqual(["presente"]);
  expect(unlocked(7)).toEqual(["presente", "passatoProssimo"]);
});

test("timpurile mai grele decât nivelul curent rămân blocate, chiar dacă cele dinainte sunt învățate", () => {
  const args = {
    vocabCards: [vocab("v-a", State.Review)],
    conjCards: [conj("v-a", "presente", { stability: 30 }), conj("v-a", "passatoProssimo", { stability: 30 })],
    available: ["presente", "passatoProssimo", "imperfetto", "congiuntivo"] as const,
  };
  // imperfetto este A2, congiuntivo este B1
  expect(unlockedTenses({ ...args, verbLevel: "A1", currentLevel: "A1" })).toEqual(["presente", "passatoProssimo"]);
  expect(unlockedTenses({ ...args, verbLevel: "A1", currentLevel: "A2" })).toEqual(["presente", "passatoProssimo", "imperfetto"]);
});

test("nivelul unui timp este cel mai mare dintre nivelul verbului și al timpului", () => {
  const args = {
    vocabCards: [vocab("v-a", State.Review)],
    conjCards: [] as StoredCard[],
    available: ["presente", "passatoProssimo"] as const,
  };
  // un verb de nivel B1 nu are conjugare la A1–A2, nici măcar presente
  expect(unlockedTenses({ ...args, verbLevel: "B1", currentLevel: "A2" })).toEqual([]);
  expect(unlockedTenses({ ...args, verbLevel: "B1", currentLevel: "B1" })).toEqual(["presente"]);
});

test("timpurile deblocate noi apar în coadă; cele existente nu se repetă ca noi", () => {
  const cards = [vocab("v-a", State.Review), conj("v-a", "presente", { stability: 40 })];
  const queue = build(cards);
  expect(queue.map((i) => [i.cardId, i.isNew])).toEqual([["conj:v-a:passatoProssimo", true]]);
});

test("limita de timpuri noi pe zi, în ordinea rangului verbelor", () => {
  const cards = [vocab("v-a", State.Review), vocab("v-b", State.Review)];
  const queue = build(cards, { newConjPerDay: 1 });
  expect(queue.map((i) => i.verbId)).toEqual(["v-a"]);
});

test("timpurile noi introduse azi se scad din limită", () => {
  const today = conj("v-a", "presente", { introducedOn: "2026-10-20" });
  const cards = [vocab("v-a", State.Review), vocab("v-b", State.Review), today];
  const queue = build(cards, { newConjPerDay: 1 });
  expect(queue.filter((i) => i.isNew)).toEqual([]);
});

test("repetițiile scadente vin înaintea celor noi și respectă limita zilnică", () => {
  const overdue = conj("v-a", "presente", { due: new Date(NOW.getTime() - 2 * DAY) });
  const cards = [vocab("v-a", State.Review), vocab("v-b", State.Review), overdue];
  const queue = build(cards, { newConjPerDay: 1 });
  expect(queue[0]).toMatchObject({ cardId: "conj:v-a:presente", isNew: false });
  expect(queue[1]).toMatchObject({ isNew: true });
  expect(build(cards, {}, 100)).toEqual([expect.objectContaining({ isNew: true })]);
});
