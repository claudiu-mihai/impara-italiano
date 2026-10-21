import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { addDays } from "../time/dayMath.ts";
import { computeStats, currentStreak, MIN_REVIEWS_FOR_STREAK } from "./stats.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0); // ziua de studiu 2026-10-20
const TODAY = "2026-10-20";
const days = (map: Record<string, number>) => new Map(Object.entries(map));

test("addDays trece peste limitele lunii și ale anului", () => {
  expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});

test("streak: zile consecutive peste prag, inclusiv azi", () => {
  const n = MIN_REVIEWS_FOR_STREAK;
  expect(currentStreak(days({ "2026-10-20": n, "2026-10-19": n, "2026-10-18": n }), TODAY)).toBe(3);
});

test("streak: dacă azi nu s-a atins pragul, continuă de ieri", () => {
  const n = MIN_REVIEWS_FOR_STREAK;
  expect(currentStreak(days({ "2026-10-20": 2, "2026-10-19": n, "2026-10-18": n }), TODAY)).toBe(2);
});

test("streak: se întrerupe dacă ieri nu s-a atins pragul", () => {
  const n = MIN_REVIEWS_FOR_STREAK;
  expect(currentStreak(days({ "2026-10-20": n, "2026-10-19": n - 1, "2026-10-18": n }), TODAY)).toBe(1);
  expect(currentStreak(days({ "2026-10-18": n }), TODAY)).toBe(0);
  expect(currentStreak(days({}), TODAY)).toBe(0);
});

function card(wordId: string, over: Partial<StoredCard> = {}, kind: "vocab" | "conj" = "vocab"): StoredCard {
  return {
    ...newStoredCard({ cardId: `${kind}:${wordId}:x`, wordId, kind, variant: "x" }, NOW, "2026-10-18"),
    state: State.Review,
    stability: 5,
    due: new Date(2026, 9, 25, 12, 0),
    ...over,
  };
}

test("statistici pe zile: repetiții, corecte, carduri noi și acuratețe", () => {
  const log = [
    { studyDay: "2026-10-20", rating: 3 },
    { studyDay: "2026-10-20", rating: 1 },
    { studyDay: "2026-10-19", rating: 4 },
    { studyDay: "2026-10-19", rating: 2 },
  ];
  const stats = computeStats({ now: NOW, days: 7, log, cards: [card("a"), card("b", { introducedOn: "2026-10-20" })], words: [] });

  expect(stats.daily).toHaveLength(7);
  expect(stats.daily.at(-1)).toEqual({ day: "2026-10-20", reviews: 2, correct: 1, newCards: 1 });
  expect(stats.daily.at(-2)).toEqual({ day: "2026-10-19", reviews: 2, correct: 2, newCards: 0 });
  expect(stats.daily[0]?.day).toBe("2026-10-14");
  expect(stats.todayReviews).toBe(2);
  expect(stats.accuracy).toBe(75);
});

test("fără repetiții acuratețea este null", () => {
  expect(computeStats({ now: NOW, days: 7, log: [], cards: [], words: [] }).accuracy).toBeNull();
});

test("prognoza: restanțele se numără la azi, restul pe zilele viitoare", () => {
  const cards = [
    card("a", { due: new Date(2026, 9, 15, 9, 0) }), // restanță
    card("b", { due: new Date(2026, 9, 20, 20, 0) }), // mai târziu azi
    card("c", { due: new Date(2026, 9, 21, 12, 0) }),
    card("d", { due: new Date(2026, 9, 21, 15, 0) }),
    card("e", { due: new Date(2026, 9, 28, 12, 0) }), // în afara a 7 zile
  ];
  const { forecast } = computeStats({ now: NOW, days: 7, log: [], cards, words: [] });
  expect(forecast).toHaveLength(7);
  expect(forecast[0]).toEqual({ day: "2026-10-20", due: 2 });
  expect(forecast[1]).toEqual({ day: "2026-10-21", due: 2 });
  expect(forecast.reduce((s, f) => s + f.due, 0)).toBe(4);
});

test("progres: cuvinte învățate/stăpânite și conjugări", () => {
  const cards = [
    card("a", { stability: 30 }),
    card("b", { stability: 3 }),
    card("c1", { stability: 40 }, "conj"),
    card("c2", { stability: 2 }, "conj"),
  ];
  const stats = computeStats({ now: NOW, days: 7, log: [], cards, words: [] });
  expect(stats.vocab).toEqual({ learned: 2, mastered: 1 });
  expect(stats.conj).toEqual({ learned: 2, mastered: 1 });
});

test("progres pe niveluri CEFR: total, începute și stăpânite, inclusiv niveluri goale", () => {
  const words = [
    { id: "a", level: "A1" as const },
    { id: "b", level: "A1" as const },
    { id: "c", level: "A1" as const },
    { id: "d", level: "A2" as const },
  ];
  const cards = [card("a", { stability: 40 }), card("b", { stability: 3 }), card("d", { stability: 25 })];
  const { levels } = computeStats({ now: NOW, days: 7, log: [], cards, words });

  expect(levels.map((l) => l.level)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
  expect(levels[0]).toEqual({ level: "A1", total: 3, started: 2, mastered: 1 });
  expect(levels[1]).toEqual({ level: "A2", total: 1, started: 1, mastered: 1 });
  expect(levels[2]).toEqual({ level: "B1", total: 0, started: 0, mastered: 0 });
});
