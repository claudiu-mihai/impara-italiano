import { expect, test } from "vitest";
import { levelForRank, loadContent } from "./content.ts";

const bands = { A1: 500, A2: 1200, B1: 2200, B2: 3000 };

test("nivelul unui rang: limitele benzilor aparțin benzii lor", () => {
  expect(levelForRank(1, bands)).toBe("A1");
  expect(levelForRank(500, bands)).toBe("A1");
  expect(levelForRank(501, bands)).toBe("A2");
  expect(levelForRank(1200, bands)).toBe("A2");
  expect(levelForRank(1201, bands)).toBe("B1");
  expect(levelForRank(3000, bands)).toBe("B2");
});

test("dincolo de ultima bandă definită rangul rămâne la ultimul nivel", () => {
  expect(levelForRank(9999, bands)).toBe("B2");
  expect(levelForRank(5, {})).toBe("B2");
});

test("toate cuvintele din dicționar au nivel, iar cele foarte frecvente sunt A1", () => {
  const { words, errors } = loadContent();
  expect(errors).toEqual([]);
  expect(words.every((w) => ["A1", "A2", "B1", "B2", "C1", "C2"].includes(w.level))).toBe(true);
  for (const id of ["v-essere", "v-avere", "n-casa", "adv-non"]) {
    expect(words.find((w) => w.id === id)?.level, id).toBe("A1");
  }
});
