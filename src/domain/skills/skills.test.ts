import { expect, test } from "vitest";
import { Rating } from "ts-fsrs";
import { gradeSkill, buildSkillRound, SKILL_ITEMS_PER_ROUND } from "./skills.ts";
import { digitForms, formatNumber, numberToItalian } from "./numbers.ts";

/** Generator determinist pentru teste. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test("numere 0–20: itemi în interval, jumătate de ascultat, jumătate de scris", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const items = buildSkillRound("numbers-0-20", seeded(seed));
    expect(items).toHaveLength(SKILL_ITEMS_PER_ROUND);
    expect(new Set(items.map((i) => (i.type === "clock-pick" || i.type === "clock-write" ? -1 : i.n))).size).toBe(5);
    for (const item of items) {
      if (item.type === "listen-number") {
        expect(item.n).toBeGreaterThanOrEqual(0);
        expect(item.n).toBeLessThanOrEqual(20);
        expect(item.answers[0]).toBe(String(item.n));
        expect(item.spoken).toBe(numberToItalian(item.n));
      } else if (item.type === "write-number") {
        expect(item.answers).toContain(numberToItalian(item.n));
      }
    }
    expect(items.some((i) => i.type === "listen-number")).toBe(true);
    expect(items.some((i) => i.type === "write-number")).toBe(true);
  }
});

test("numere 21–100", () => {
  const items = buildSkillRound("numbers-21-100", seeded(7));
  for (const item of items) {
    if (item.type === "listen-number" || item.type === "write-number") {
      expect(item.n).toBeGreaterThanOrEqual(21);
      expect(item.n).toBeLessThanOrEqual(100);
    }
  }
});

test("numere 100–1.000.000: trepte diferite, răspuns cu cifre în mai multe scrieri, litere acceptate", () => {
  const seen = new Set<number>();
  for (let seed = 1; seed <= 40; seed++) {
    for (const item of buildSkillRound("numbers-big", seeded(seed))) {
      if (item.type !== "listen-number" && item.type !== "write-number") throw new Error("tip neașteptat");
      expect(item.n).toBeGreaterThanOrEqual(101);
      expect(item.n).toBeLessThanOrEqual(1_000_000);
      seen.add(item.n);
      if (item.type === "listen-number") {
        expect(item.answers).toContain(String(item.n));
        expect(item.answers).toContain(formatNumber(item.n));
      } else {
        expect(item.answers).toContain(numberToItalian(item.n));
      }
    }
  }
  expect([...seen].some((n) => n < 1000)).toBe(true);
  expect([...seen].some((n) => n >= 1000 && n < 10_000)).toBe(true);
  expect([...seen].some((n) => n >= 100_000)).toBe(true);
});

test("cifrele se formatează cu punct: 1.234.567", () => {
  expect(formatNumber(7)).toBe("7");
  expect(formatNumber(999)).toBe("999");
  expect(formatNumber(1234)).toBe("1.234");
  expect(formatNumber(1_000_000)).toBe("1.000.000");
  expect(digitForms(21000)).toEqual(["21000", "21.000", "21 000"]);
});

test("ceas: ore diferite, minute multiplu de 5, variante distincte cu răspunsul corect", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const items = buildSkillRound("clock", seeded(seed));
    const times = items.map((i) => (i.type === "clock-write" || i.type === "clock-pick" ? `${i.time.hour}:${i.time.minute}` : ""));
    expect(new Set(times).size).toBe(items.length);
    for (const item of items) {
      if (item.type === "clock-write") expect(item.answers.length).toBeGreaterThan(0);
      if (item.type === "clock-pick") {
        expect(item.options).toHaveLength(4);
        expect(item.options[item.correctIndex]).toEqual(item.time);
        expect(new Set(item.options.map((o) => `${o.hour}:${o.minute}`)).size).toBe(4);
      }
    }
  }
});

test("nota: toți corecți → Bine, unul greșit → Greu, mai mulți → Din nou", () => {
  expect(gradeSkill(["correct", "correct", "correct", "correct", "correct"])).toBe(Rating.Good);
  expect(gradeSkill(["correct", "wrong", "correct", "correct", "correct"])).toBe(Rating.Hard);
  expect(gradeSkill(["wrong", "wrong", "correct", "correct", "correct"])).toBe(Rating.Again);
  expect(gradeSkill(["correct", "almost", "correct", "correct", "correct"])).toBe(Rating.Hard);
});
