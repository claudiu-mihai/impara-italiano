import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import type { StoredCard } from "../srs/types.ts";
import { isComboMilestone, isMilestone, nextCombo, shouldGradeFollowUp } from "./rewards.ts";

const NOW = new Date(2026, 10, 24, 12, 0, 0);

const card = (over: Partial<StoredCard>): StoredCard =>
  ({
    cardId: "vocab:n-caffè:it-ro",
    wordId: "n-caffè",
    kind: "vocab",
    variant: "it-ro",
    introducedOn: "2026-11-20",
    due: NOW,
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 1,
    lapses: 0,
    state: State.Learning,
    ...over,
  }) as StoredCard;

test("combo: crește la răspuns corect, revine la 0 la greșeală", () => {
  expect(nextCombo(4, true)).toBe(5);
  expect(nextCombo(4, false)).toBe(0);
});

test("reperele de combo: 3, 5, 10, 20", () => {
  for (const n of [3, 5, 10, 20]) expect(isComboMilestone(n)).toBe(true);
  for (const n of [0, 1, 2, 4, 21]) expect(isComboMilestone(n)).toBe(false);
});

test("reperele de carduri: 25, 50, apoi fiecare 100", () => {
  for (const n of [25, 50, 100, 200, 300]) expect(isMilestone(n)).toBe(true);
  for (const n of [0, 24, 75, 150]) expect(isMilestone(n)).toBe(false);
});

test("grila de după un cuvânt nou se notează doar dacă e IT → RO și cardul e scadent acum", () => {
  expect(shouldGradeFollowUp(card({}), "it-ro", NOW)).toBe(true);
  expect(shouldGradeFollowUp(card({}), "ro-it", NOW)).toBe(false);
  expect(shouldGradeFollowUp(undefined, "it-ro", NOW)).toBe(false);
  const later = card({ state: State.Review, due: new Date(NOW.getTime() + 3 * 86_400_000) });
  expect(shouldGradeFollowUp(later, "it-ro", NOW)).toBe(false);
});
