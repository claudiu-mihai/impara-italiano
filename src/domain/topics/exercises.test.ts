import { expect, test } from "vitest";
import type { CoreWord } from "../content/types.ts";
import { buildCatRound, CAT_ITEMS } from "./cat.ts";
import { buildFollowQuestions, buildMatchRounds, isNextInSequence } from "./exercises.ts";

const word = (id: string, it: string, ro: string): CoreWord => ({ id, it, ro, pos: "adverb", rank: 1, level: "A1" });
const days = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"].map((d, i) =>
  word(`n-${d}`, d, ["luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"][i]!),
);

test("potrivește perechi: toate cuvintele apar, runde de câte 5, fără traduceri identice în aceeași rundă", () => {
  const rounds = buildMatchRounds(days);
  // ultima rundă scurtă e completată cu perechi din prima, deci unele cuvinte apar de două ori
  expect([...new Set(rounds.flat().map((p) => p.wordId))].sort()).toEqual(days.map((d) => d.id).sort());
  expect(rounds.at(-1)!.length).toBeGreaterThanOrEqual(3);
  expect(rounds.every((r) => r.length <= 5)).toBe(true);
  const dup = buildMatchRounds([word("a", "porta", "ușă"), word("b", "uscio", "ușă"), word("c", "casa", "casă")]);
  for (const round of dup) expect(new Set(round.map((p) => p.ro)).size).toBe(round.length);
});

test("ce urmează după…: ciclic vs. necilicic", () => {
  const sequence = days.map((d) => d.id);
  const cyclic = buildFollowQuestions(sequence, true, 14);
  expect(cyclic).toHaveLength(14);
  const sunday = cyclic.find((q) => q.fromId === "n-domenica" && q.kind === "after");
  expect(sunday?.correctId).toBe("n-lunedì");
  const linear = buildFollowQuestions(sequence, false, 14);
  expect(linear.find((q) => q.fromId === "n-domenica" && q.kind === "after")).toBeUndefined();
  expect(linear.find((q) => q.fromId === "n-lunedì" && q.kind === "before")).toBeUndefined();
  for (const q of [...cyclic, ...linear]) {
    expect(q.optionIds).toHaveLength(4);
    expect(new Set(q.optionIds).size).toBe(4);
    expect(q.optionIds).toContain(q.correctId);
    expect(q.optionIds).not.toContain(q.fromId);
  }
});

test("ordonare: următorul element corect", () => {
  expect(isNextInSequence(["a", "b", "c"], [], "a")).toBe(true);
  expect(isNextInSequence(["a", "b", "c"], ["a"], "c")).toBe(false);
});

test("unde e Lupino: 12 poziții, variante distincte care conțin răspunsul", () => {
  expect(CAT_ITEMS).toHaveLength(12);
  for (let i = 0; i < 30; i++) {
    const round = buildCatRound(6);
    expect(round).toHaveLength(6);
    expect(round.filter((q) => q.mode === "choose")).toHaveLength(3);
    for (const q of round) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.item.answer);
    }
  }
});
