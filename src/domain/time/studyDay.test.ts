import { expect, test } from "vitest";
import { endOfStudyDay, studyDayOf } from "./studyDay.ts";

test("înainte de 04:00 aparține zilei de studiu anterioare", () => {
  expect(studyDayOf(new Date(2026, 9, 20, 3, 59))).toBe("2026-10-19");
  expect(studyDayOf(new Date(2026, 9, 20, 0, 5))).toBe("2026-10-19");
});

test("de la 04:00 începe ziua nouă", () => {
  expect(studyDayOf(new Date(2026, 9, 20, 4, 0))).toBe("2026-10-20");
  expect(studyDayOf(new Date(2026, 9, 20, 23, 59))).toBe("2026-10-20");
});

test("trecerea dintre luni și ani", () => {
  expect(studyDayOf(new Date(2026, 10, 1, 2, 0))).toBe("2026-10-31");
  expect(studyDayOf(new Date(2027, 0, 1, 1, 0))).toBe("2026-12-31");
});

test("sfârșitul zilei de studiu este 04:00 următor", () => {
  expect(endOfStudyDay(new Date(2026, 9, 20, 15, 0))).toEqual(new Date(2026, 9, 21, 4, 0));
  expect(endOfStudyDay(new Date(2026, 9, 20, 2, 0))).toEqual(new Date(2026, 9, 20, 4, 0));
  expect(endOfStudyDay(new Date(2026, 9, 20, 4, 0))).toEqual(new Date(2026, 9, 21, 4, 0));
});
