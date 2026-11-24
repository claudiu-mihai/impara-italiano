import { expect, test } from "vitest";
import { seededRandom } from "./random.ts";

test("seededRandom: aceeași sămânță dă aceeași secvență, în [0, 1)", () => {
  const a = seededRandom(1);
  const b = seededRandom(1);
  const first = Array.from({ length: 50 }, () => a());
  expect(Array.from({ length: 50 }, () => b())).toEqual(first);
  expect(first.every((x) => x >= 0 && x < 1)).toBe(true);
});

test("seededRandom: semințe diferite dau secvențe diferite", () => {
  expect(seededRandom(1)()).not.toBe(seededRandom(2)());
});
