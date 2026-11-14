import { Rating, State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { dueGrammarIds } from "./due.ts";
import { dueGrammarTopics, grammarCardId, grammarCountsForSrs, gradeGrammar, newGrammarCard, reviewGrammarCard } from "./review.ts";

const NOW = new Date(2026, 10, 15, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function card(topicId: string, dueInDays: number): StoredCard {
  return { ...newGrammarCard(topicId, NOW), state: State.Review, due: new Date(NOW.getTime() + dueInDays * DAY), stability: 5 };
}

test("cardul unei lecții: un card de tip abilitate, deosebit de numere și ceas", () => {
  expect(grammarCardId("articoli")).toBe("skill:grammar:articoli");
  const c = newGrammarCard("articoli", NOW);
  expect(c).toMatchObject({ cardId: "skill:grammar:articoli", wordId: "grammar:articoli", kind: "skill" });
});

test("nota din scorul la Scrie: 10/10 → Bine, 8–9 → Greu, sub 8 → Din nou", () => {
  expect(gradeGrammar(10, 10)).toBe(Rating.Good);
  expect(gradeGrammar(9, 10)).toBe(Rating.Hard);
  expect(gradeGrammar(8, 10)).toBe(Rating.Hard);
  expect(gradeGrammar(7, 10)).toBe(Rating.Again);
  expect(gradeGrammar(0, 10)).toBe(Rating.Again);
  // sesiuni mai scurte (lecție cu puține exemple): același prag, în procente
  expect(gradeGrammar(4, 5)).toBe(Rating.Hard);
  expect(gradeGrammar(0, 0)).toBe(Rating.Again);
});

test("se notează prima rundă la o lecție nouă sau scadentă; la una programată pentru mai târziu, nu", () => {
  expect(grammarCountsForSrs(undefined, NOW)).toBe(true);
  expect(grammarCountsForSrs(card("articoli", -1), NOW)).toBe(true);
  expect(grammarCountsForSrs(card("articoli", 3), NOW)).toBe(false);
  // un card nou, încă neprogramat (creat azi), e scadent
  expect(grammarCountsForSrs(newStoredCard({ cardId: "skill:grammar:x", wordId: "grammar:x", kind: "skill", variant: "auto" }, NOW, "2026-11-15"), NOW)).toBe(true);
});

test("lecțiile scadente, în ordinea de învățare; restul cardurilor (vocabular, numere) nu contează", () => {
  const topics = [{ id: "articoli" }, { id: "essere" }, { id: "avere" }];
  const other: StoredCard = { ...card("x", -2), cardId: "skill:clock", wordId: "clock" };
  const cards = [card("avere", -1), card("essere", 4), card("articoli", -3), other];
  expect(dueGrammarTopics(topics, cards, NOW).map((t) => t.id)).toEqual(["articoli", "avere"]);
});

test("id-urile lecțiilor scadente se află doar din carduri", () => {
  expect(dueGrammarIds([card("avere", -1), card("essere", 2), { ...card("x", -1), cardId: "skill:clock" }], NOW)).toEqual(["avere"]);
});

test("fără pași scurți: o lecție terminată nu revine peste 10 minute, ci peste cel puțin o zi (chiar și la Din nou, a doua zi)", () => {
  for (const grade of [Rating.Again, Rating.Hard, Rating.Good] as const) {
    const { card: next } = reviewGrammarCard(undefined, "articoli", grade, NOW, 0.9);
    expect(next.state, `nota ${grade}`).toBe(State.Review);
    expect(next.due.getTime() - NOW.getTime(), `nota ${grade}`).toBeGreaterThanOrEqual(DAY * 0.9);
    expect(grammarCountsForSrs(next, NOW)).toBe(false);
  }
});
