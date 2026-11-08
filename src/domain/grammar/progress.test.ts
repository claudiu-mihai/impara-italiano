import { expect, test } from "vitest";
import { bestScore, grammarSummary, matchScore, typeScore } from "./progress.ts";

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

test("grammarSummary: lecții citite din total și media celor mai bune scoruri", () => {
  const topics = ["a", "b", "c"].map((id) => ({ id }));
  // fără progres
  expect(grammarSummary(topics, [])).toEqual({ read: 0, total: 3 });
  // două lecții cu scoruri (80 și 100), una citită fără scor; media se face doar pe cele cu scor
  const rows = [
    { topicId: "a", readAt: 1, best: { type: 80 } },
    { topicId: "b", readAt: 2, best: { match: 60, type: 100 } },
    { topicId: "c", readAt: 3, best: {} },
  ];
  expect(grammarSummary(topics, rows)).toEqual({ read: 3, total: 3, averageBest: 90 });
  // scorul fără „citit” nu face lecția citită; rândurile unor teme dispărute din conținut se ignoră
  expect(
    grammarSummary(topics, [{ topicId: "a", best: { type: 70 } }, { topicId: "sters", readAt: 5, best: { type: 100 } }]),
  ).toEqual({ read: 0, total: 3, averageBest: 70 });
});
