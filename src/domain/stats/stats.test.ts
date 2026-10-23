import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { addDays } from "../time/dayMath.ts";
import { activityCalendar, activityLevel, CALENDAR_WEEKS, computeStats, currentStreak, longestStreak, MIN_REVIEWS_FOR_STREAK } from "./stats.ts";

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

// ---- zile totale, serie record, calendar ----

const GOAL = MIN_REVIEWS_FOR_STREAK;

test("cea mai lungă serie: ia cea mai lungă secvență, ignoră zilele sub prag și golurile", () => {
  const reviews = days({
    "2026-10-01": GOAL, "2026-10-02": GOAL, "2026-10-03": GOAL, // 3
    "2026-10-04": GOAL - 1, // sub prag: rupe seria
    "2026-10-05": GOAL, "2026-10-06": GOAL, // 2
    "2026-10-09": GOAL * 2, "2026-10-10": GOAL, "2026-10-11": GOAL, "2026-10-12": GOAL, // 4, după un gol
  });
  expect(longestStreak(reviews)).toBe(4);
  expect(longestStreak(days({}))).toBe(0);
  expect(longestStreak(days({ "2026-10-01": 3 }))).toBe(0);
  expect(longestStreak(days({ "2026-12-31": GOAL, "2027-01-01": GOAL }))).toBe(2); // trece peste an
});

test("statistici: zile de studiu totale (și cele sub prag), prima zi, seria record", () => {
  const log = [
    { studyDay: "2026-09-01", rating: 3 },
    { studyDay: "2026-09-01", rating: 3 },
    { studyDay: "2026-10-18", rating: 3 },
    ...Array.from({ length: GOAL }, () => ({ studyDay: "2026-10-19", rating: 3 })),
    ...Array.from({ length: GOAL }, () => ({ studyDay: "2026-10-20", rating: 3 })),
  ];
  const stats = computeStats({ now: NOW, days: 7, log, cards: [], words: [] });
  expect(stats.activeDays).toBe(4);
  expect(stats.firstDay).toBe("2026-09-01");
  expect(stats.streak).toBe(2);
  expect(stats.longestStreak).toBe(2);

  const empty = computeStats({ now: NOW, days: 7, log: [], cards: [], words: [] });
  expect(empty).toMatchObject({ activeDays: 0, firstDay: null, longestStreak: 0 });
});

test("nivelul de intensitate al unei zile", () => {
  expect(activityLevel(0)).toBe(0);
  expect(activityLevel(1)).toBe(1);
  expect(activityLevel(GOAL / 2 - 1)).toBe(1);
  expect(activityLevel(GOAL / 2)).toBe(2);
  expect(activityLevel(GOAL - 1)).toBe(2);
  expect(activityLevel(GOAL)).toBe(3);
  expect(activityLevel(GOAL * 3 - 1)).toBe(3);
  expect(activityLevel(GOAL * 3)).toBe(4);
});

test("calendar: săptămâni luni–duminică, ultima conține azi, zilele de după azi sunt viitoare", () => {
  // 2026-10-20 este marți
  const calendar = activityCalendar(days({ "2026-10-20": GOAL, "2026-10-19": 2 }), TODAY, 4);
  expect(calendar).toHaveLength(4);
  expect(calendar.every((week) => week.length === 7)).toBe(true);
  expect(calendar[3]!.map((d) => d.day)).toEqual([
    "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
  ]);
  expect(calendar[0]![0]!.day).toBe("2026-09-28"); // luni, cu 3 săptămâni înainte
  expect(calendar[3]!.map((d) => d.future)).toEqual([false, false, true, true, true, true, true]);
  expect(calendar[3]![0]).toMatchObject({ reviews: 2, level: 1 });
  expect(calendar[3]![1]).toMatchObject({ reviews: GOAL, level: 3 });
  // fiecare zi apare o singură dată, în ordine, fără goluri
  const all = calendar.flat().map((d) => d.day);
  expect(all).toEqual(all.map((_, i) => addDays("2026-09-28", i)));
});

test("calendar: duminica este ultima zi a săptămânii, iar luni începe una nouă", () => {
  expect(activityCalendar(days({}), "2026-10-18", 1)[0]!.map((d) => d.day)[6]).toBe("2026-10-18"); // duminică
  expect(activityCalendar(days({}), "2026-10-19", 2)[1]![0]!.day).toBe("2026-10-19"); // luni
  expect(activityCalendar(days({}), "2026-10-19", 1)[0]!.slice(1).every((d) => d.future)).toBe(true);
});

test("statistici: calendarul are CALENDAR_WEEKS săptămâni și acoperă și zilele vechi", () => {
  const stats = computeStats({ now: NOW, days: 7, log: [{ studyDay: "2026-08-10", rating: 3 }], cards: [], words: [] });
  expect(stats.calendar).toHaveLength(CALENDAR_WEEKS);
  expect(stats.calendar.flat().find((d) => d.day === "2026-08-10")?.reviews).toBe(1);
});
