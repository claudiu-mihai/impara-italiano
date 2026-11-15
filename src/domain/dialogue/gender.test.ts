import { expect, test } from "vitest";
import { genderMarkupProblems, genderParts, resolveGender } from "./gender.ts";

test("alege varianta pentru bărbat sau pentru femeie", () => {
  expect(resolveGender("Sei sposat{o|a}?", "f")).toBe("Sei sposata?");
  expect(resolveGender("Sei sposat{o|a}?", "m")).toBe("Sei sposato?");
  expect(resolveGender("Sunt român{|că}.", "m")).toBe("Sunt român.");
  expect(resolveGender("Sunt român{|că}.", "f")).toBe("Sunt româncă.");
  expect(resolveGender("{Benvenuto|Benvenuta}!", "f")).toBe("Benvenuta!");
});

test("textul fără marcaj rămâne neschimbat, fără evidențiere", () => {
  expect(resolveGender("Buongiorno!", "f")).toBe("Buongiorno!");
  expect(genderParts("Buongiorno!", "f")).toEqual([{ text: "Buongiorno!", gendered: false }]);
});

test("cuvântul care se schimbă după gen e un segment separat, întreg", () => {
  expect(genderParts("Buongiorno, {signore|signora}!", "f")).toEqual([
    { text: "Buongiorno, ", gendered: false },
    { text: "signora", gendered: true },
    { text: "!", gendered: false },
  ]);
  expect(genderParts("Sei sposat{o|a}", "m")).toEqual([
    { text: "Sei ", gendered: false },
    { text: "sposato", gendered: true },
  ]);
});

test("marcaj greșit: fără „|”, cu mai multe, neînchis sau imbricat", () => {
  expect(genderMarkupProblems("Sei sposat{o|a}?")).toEqual([]);
  expect(genderMarkupProblems("sposat{o}")).not.toEqual([]);
  expect(genderMarkupProblems("sposat{o|a|i}")).not.toEqual([]);
  expect(genderMarkupProblems("sposat{o|a")).not.toEqual([]);
  expect(genderMarkupProblems("sposat{{o|a}|i}")).not.toEqual([]);
  expect(genderMarkupProblems("sposato}")).not.toEqual([]);
});
