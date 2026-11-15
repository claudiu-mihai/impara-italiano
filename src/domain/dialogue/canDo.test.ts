import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import type { StoredCard } from "../srs/types.ts";
import { canDoList } from "./canDo.ts";
import { newDialogueCard } from "./review.ts";

const NOW = new Date(2026, 10, 15, 10, 0, 0);
const DIALOGUES = [
  { id: "la-bar-01", level: "A1" as const },
  { id: "ora-01", level: "A1" as const },
  { id: "la-hotel-01", level: "A2" as const },
];

const card = (id: string, stability: number): StoredCard => ({ ...newDialogueCard(id, NOW), state: State.Review, stability });

test("la A1 doar reperele dialogurilor A1, la A2 toate, în ordinea din date", () => {
  expect(canDoList(DIALOGUES, [], "A1").map((x) => x.dialogue.id)).toEqual(["la-bar-01", "ora-01"]);
  expect(canDoList(DIALOGUES, [], "A2").map((x) => x.dialogue.id)).toEqual(["la-bar-01", "ora-01", "la-hotel-01"]);
});

test("un reper e bifat când dialogul e învățat (stabilitate de cel puțin 7 zile)", () => {
  const list = canDoList(DIALOGUES, [card("la-bar-01", 10), card("ora-01", 3)], "A1");
  expect(list.map((x) => x.learned)).toEqual([true, false]);
});
