import { expect, test } from "vitest";
import { bestScore, grammarProgressSchema, matchScore, typeScore } from "./progress.ts";

test("scoruri", () => {
  expect(typeScore(7, 10)).toBe(70);
  expect(typeScore(2, 3)).toBe(67);
  expect(typeScore(0, 0)).toBe(0);
  expect(matchScore(10, 0)).toBe(100);
  expect(matchScore(10, 5)).toBe(67);
  expect(matchScore(0, 0)).toBe(0);
  expect(bestScore({ best: { match: 80, type: 60 } })).toBe(80);
  expect(bestScore({ best: {} })).toBeUndefined();
  expect(bestScore(undefined)).toBeUndefined();
});

test("grammarProgressSchema: procente întregi 0–100", () => {
  expect(grammarProgressSchema.safeParse({ readAt: 5, best: { type: 100 } }).success).toBe(true);
  expect(grammarProgressSchema.safeParse({ best: { type: 140 } }).success).toBe(false);
  expect(grammarProgressSchema.safeParse({ best: { match: 50.5 } }).success).toBe(false);
  expect(grammarProgressSchema.safeParse("x").success).toBe(false);
});
