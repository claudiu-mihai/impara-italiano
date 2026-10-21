import { Rating, State } from "ts-fsrs";
import { expect, test } from "vitest";
import { formatInterval } from "./format.ts";
import { masteryOf } from "./mastery.ts";
import { newStoredCard, previewDue, reviewStoredCard } from "./scheduler.ts";
import { vocabCardId } from "./types.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0);
const init = { cardId: vocabCardId("v-parlare", "it-ro"), wordId: "v-parlare", kind: "vocab", variant: "it-ro" } as const;

test("un card nou are starea New și păstrează identificarea", () => {
  const card = newStoredCard(init, NOW, "2026-10-20");
  expect(card.state).toBe(State.New);
  expect(card.cardId).toBe("vocab:v-parlare:it-ro");
  expect(card.introducedOn).toBe("2026-10-20");
});

test("Bine pe un card nou îl programează în viitor și îi crește numărul de repetiții", () => {
  const card = newStoredCard(init, NOW, "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, Rating.Good, NOW, 0.9);
  expect(next.reps).toBe(1);
  expect(next.due.getTime()).toBeGreaterThan(NOW.getTime());
  expect(next.cardId).toBe(card.cardId);
  expect(next.introducedOn).toBe("2026-10-20");
  expect(log.rating).toBe(Rating.Good);
});

test("Din nou reprogramează cardul în câteva minute, nu în zile", () => {
  const card = newStoredCard(init, NOW, "2026-10-20");
  const { card: next } = reviewStoredCard(card, Rating.Again, NOW, 0.9);
  expect(next.due.getTime() - NOW.getTime()).toBeLessThan(60 * 60 * 1000);
  expect([State.Learning, State.Relearning]).toContain(next.state);
});

test("intervalele cresc de la Din nou la Ușor", () => {
  const card = newStoredCard(init, NOW, "2026-10-20");
  const due = previewDue(card, NOW, 0.9);
  expect(due[1].getTime()).toBeLessThanOrEqual(due[2].getTime());
  expect(due[2].getTime()).toBeLessThanOrEqual(due[3].getTime());
  expect(due[3].getTime()).toBeLessThan(due[4].getTime());
});

test("nivelul de stăpânire: nou / în învățare / stăpânit", () => {
  expect(masteryOf([])).toBe("new");
  expect(masteryOf([{ stability: 5 }])).toBe("learning");
  expect(masteryOf([{ stability: 30 }, { stability: 21 }])).toBe("mastered");
  // un card slab trage în jos tot cuvântul
  expect(masteryOf([{ stability: 90 }, { stability: 3 }])).toBe("learning");
});

test("etichete pentru intervale", () => {
  const at = (ms: number) => new Date(NOW.getTime() + ms);
  const MIN = 60_000;
  const DAY = 24 * 60 * MIN;
  expect(formatInterval(at(10_000), NOW)).toBe("< 1 min");
  expect(formatInterval(at(10 * MIN), NOW)).toBe("10 min");
  expect(formatInterval(at(3 * 60 * MIN), NOW)).toBe("3 h");
  expect(formatInterval(at(DAY), NOW)).toBe("1 zi");
  expect(formatInterval(at(5 * DAY), NOW)).toBe("5 zile");
  expect(formatInterval(at(60 * DAY), NOW)).toBe("2 luni");
});
