import { Rating } from "ts-fsrs";
import { expect, test } from "vitest";
import { compareAnswer, type AnswerResult } from "./compareAnswer.ts";
import { gradeConjugation, gradeConjugationTable } from "./gradeConjugation.ts";
import { normalize, stripAccents } from "./normalize.ts";

test("normalizarea ignoră majusculele, spațiile și tipul de apostrof", () => {
  expect(normalize("  Dov’è   la STAZIONE ")).toBe("dov'è la stazione");
  expect(stripAccents("parlerò è più")).toBe("parlero e piu");
});

test("răspuns corect, indiferent de majuscule și spații", () => {
  expect(compareAnswer(" Parlo ", ["parlo"])).toBe("correct");
  expect(compareAnswer("abbiamo   parlato", ["abbiamo parlato"])).toBe("correct");
});

test("greșeală doar de accent = aproape", () => {
  expect(compareAnswer("parlero", ["parlerò"])).toBe("almost");
  expect(compareAnswer("e andato", ["è andato", "è andata"])).toBe("almost");
});

test("accentul greșit sau în plus este tot aproape; altă literă este greșit", () => {
  expect(compareAnswer("parlérò", ["parlerò"])).toBe("almost");
  expect(compareAnswer("parlo", ["parli"])).toBe("wrong");
  expect(compareAnswer("", ["parlo"])).toBe("wrong");
});

test("se acceptă oricare dintre formele alternative (acord la essere)", () => {
  const accepted = ["sono andato", "sono andata"];
  expect(compareAnswer("sono andata", accepted)).toBe("correct");
  expect(compareAnswer("sono andati", accepted)).toBe("wrong");
});

test("nota unei repetiții de conjugare", () => {
  expect(gradeConjugation(["correct", "correct", "correct"])).toBe(Rating.Good);
  expect(gradeConjugation(["correct", "correct", "wrong"])).toBe(Rating.Hard);
  expect(gradeConjugation(["correct", "wrong", "wrong"])).toBe(Rating.Again);
  expect(gradeConjugation(["wrong", "wrong", "wrong"])).toBe(Rating.Again);
});

test("o greșeală de accent limitează nota la Greu", () => {
  expect(gradeConjugation(["correct", "almost", "correct"])).toBe(Rating.Hard);
  expect(gradeConjugation(["almost", "almost", "almost"])).toBe(Rating.Hard);
  expect(gradeConjugation(["almost", "correct", "wrong"])).toBe(Rating.Hard);
  expect(gradeConjugation(["almost", "wrong", "wrong"])).toBe(Rating.Again);
});

test("nota variantei Tabel: toate corecte → Bine, cel puțin 2/3 → Greu, mai puțin → Din nou", () => {
  const six = (wrong: number, almost = 0) => [
    ...Array<AnswerResult>(wrong).fill("wrong"),
    ...Array<AnswerResult>(almost).fill("almost"),
    ...Array<AnswerResult>(6 - wrong - almost).fill("correct"),
  ];
  expect(gradeConjugationTable(six(0))).toBe(Rating.Good);
  expect(gradeConjugationTable(six(0, 1))).toBe(Rating.Hard);
  expect(gradeConjugationTable(six(1))).toBe(Rating.Hard);
  expect(gradeConjugationTable(six(2))).toBe(Rating.Hard);
  expect(gradeConjugationTable(six(3))).toBe(Rating.Again);
  expect(gradeConjugationTable(["correct", "wrong", "wrong", "wrong", "correct"])).toBe(Rating.Again);
});

const TOLERANT = { typoTolerance: true };

test("cu toleranță, o literă greșită, lipsă, în plus sau inversată = greșeală mică", () => {
  expect(compareAnswer("parlaro", ["parlerò"], TOLERANT)).toBe("typo");
  expect(compareAnswer("abbiamo parlto", ["abbiamo parlato"], TOLERANT)).toBe("typo");
  expect(compareAnswer("parllare", ["parlare"], TOLERANT)).toBe("typo");
  expect(compareAnswer("parlaer", ["parlare"], TOLERANT)).toBe("typo");
});

test("fără toleranță (implicit), aceeași greșeală rămâne greșit", () => {
  expect(compareAnswer("parlto", ["parlato"])).toBe("wrong");
  expect(compareAnswer("parlto", ["parlato"], { typoTolerance: false })).toBe("wrong");
});

test("forma exactă și greșeala de accent au prioritate față de greșeala mică", () => {
  expect(compareAnswer("parlo", ["parlo"], TOLERANT)).toBe("correct");
  expect(compareAnswer("parlero", ["parlerò"], TOLERANT)).toBe("almost");
});

test("o altă formă validă a verbului nu se iartă (parli ≠ parla)", () => {
  expect(compareAnswer("parli", ["parla"], { ...TOLERANT, exclude: ["parlo", "parli", "parla"] })).toBe("wrong");
  expect(compareAnswer("parlla", ["parla"], { ...TOLERANT, exclude: ["parlo", "parli", "parla"] })).toBe("typo");
});

test("formele scurte (sub 4 litere) nu se iartă: ho ≠ hi", () => {
  expect(compareAnswer("hi", ["ho"], TOLERANT)).toBe("wrong");
  expect(compareAnswer("sei", ["sia"], TOLERANT)).toBe("wrong");
});

test("o greșeală mică limitează nota la Greu și se numără ca răspuns corect", () => {
  expect(gradeConjugation(["correct", "correct", "typo"])).toBe(Rating.Hard);
  expect(gradeConjugation(["typo", "correct", "wrong"])).toBe(Rating.Hard);
  expect(gradeConjugation(["typo", "wrong", "wrong"])).toBe(Rating.Again);
  expect(gradeConjugationTable(["correct", "correct", "typo", "correct", "correct", "correct"])).toBe(Rating.Hard);
});
