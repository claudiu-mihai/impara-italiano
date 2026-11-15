import { Rating, State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newGrammarCard } from "../grammar/review.ts";
import type { StoredCard } from "../srs/types.ts";
import {
  dialogueCardId,
  dialogueCountsForSrs,
  dialogueSkillId,
  dueDialogueIds,
  dueDialogues,
  hasDialogueCards,
  isDialogueLearned,
} from "./due.ts";
import { newDialogueCard, reviewDialogueCard } from "./review.ts";

const NOW = new Date(2026, 10, 15, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function card(id: string, dueInDays: number, stability = 5): StoredCard {
  return { ...newDialogueCard(id, NOW), state: State.Review, due: new Date(NOW.getTime() + dueInDays * DAY), stability };
}

test("cardul unui dialog: un card de tip abilitate, deosebit de gramatică", () => {
  expect(dialogueSkillId("la-bar-01")).toBe("dialogue:la-bar-01");
  expect(dialogueCardId("la-bar-01")).toBe("skill:dialogue:la-bar-01");
  const fresh = newDialogueCard("la-bar-01", NOW);
  expect(fresh).toMatchObject({ cardId: "skill:dialogue:la-bar-01", wordId: "dialogue:la-bar-01", kind: "skill", variant: "auto" });
});

test("se notează un dialog nou sau scadent, nu unul programat mai târziu", () => {
  expect(dialogueCountsForSrs(undefined, NOW)).toBe(true);
  expect(dialogueCountsForSrs(card("la-bar-01", -1), NOW)).toBe(true);
  expect(dialogueCountsForSrs(card("la-bar-01", 3), NOW)).toBe(false);
});

test("scadentele: doar cardurile de dialog, în ordinea listei", () => {
  const grammar = { ...newGrammarCard("articoli", NOW), state: State.Review, due: new Date(NOW.getTime() - DAY) };
  const cards = [card("ora-01", -2), card("la-bar-01", -1), card("familia-01", 4), grammar];
  expect(dueDialogueIds(cards, NOW).sort()).toEqual(["la-bar-01", "ora-01"]);
  const list = [{ id: "la-bar-01" }, { id: "ora-01" }, { id: "familia-01" }];
  expect(dueDialogues(list, cards, NOW).map((d) => d.id)).toEqual(["la-bar-01", "ora-01"]);
  expect(hasDialogueCards([grammar])).toBe(false);
  expect(hasDialogueCards(cards)).toBe(true);
});

test("învățat = stabilitate de cel puțin 7 zile", () => {
  expect(isDialogueLearned(undefined)).toBe(false);
  expect(isDialogueLearned(card("la-bar-01", 3, 6.9))).toBe(false);
  expect(isDialogueLearned(card("la-bar-01", 3, 7))).toBe(true);
});

test("„Bine” la un dialog nou îl programează peste cel puțin o zi (fără pașii scurți)", () => {
  const { card: next } = reviewDialogueCard(undefined, "la-bar-01", Rating.Good, NOW, 0.9);
  expect(next.cardId).toBe("skill:dialogue:la-bar-01");
  expect(next.due.getTime() - NOW.getTime()).toBeGreaterThanOrEqual(DAY);
});
