import { expect, test } from "vitest";
import { packItemSchema, type Level, type PackItem } from "../content/schema.ts";
import { packProblems, resolvePackLevel } from "./check.ts";

const LEVELS_OF: Record<string, Level> = { "n-bocca": "A1", "n-lupo": "B1", "v-salire": "A2", "n-fattoria": "C1" };
const levelOf = (id: string) => LEVELS_OF[id];

const loc = (it: string, ro = it) => ({ it, ro });

const espr = (over: Record<string, unknown> = {}) =>
  ({
    id: "espr-a",
    kind: "espressione",
    level: "A1",
    it: "In bocca al lupo!",
    ro: "Baftă!",
    explain: loc("Si dice per augurare fortuna."),
    wordIds: [],
    ...over,
  }) as PackItem;

const falso = (over: Record<string, unknown> = {}) =>
  ({
    id: "falso-a",
    kind: "falso-amico",
    it: "salire",
    ro: "a urca",
    explain: loc("Non vuol dire «a sări»."),
    wordIds: ["v-salire"],
    ...over,
  }) as PackItem;

const modo = (over: Record<string, unknown> = {}) =>
  ({
    id: "modo-essere-al-verde",
    kind: "modo-di-dire",
    level: "B1",
    it: "Essere al verde",
    ro: "A fi lefter",
    literal: "a fi la verde",
    match: "different",
    explain: loc("Si dice quando non si hanno soldi."),
    wordIds: ["n-lupo"],
    quiz: { question: loc("Cosa significa?"), options: ["Non avere soldi", "Essere felice", "Amare i colori"], answer: 0 },
    ...over,
  }) as PackItem;

const story = (over: Record<string, unknown> = {}) =>
  ({
    id: "stor-a",
    kind: "micro-storia",
    level: "A1",
    title: loc("Un caffè"),
    speakers: [
      { id: "voce", name: loc("Narratore"), voice: "francesco", narrator: true },
      { id: "lui", name: loc("Marco"), voice: "luca" },
    ],
    lines: [
      { speaker: "voce", it: "Marco entra al bar.", ro: "Marco intră în bar." },
      { speaker: "lui", it: "Un caffè, grazie.", ro: "O cafea, mulțumesc." },
      { speaker: "voce", it: "Il caffè costa un euro.", ro: "Cafeaua costă un euro." },
    ],
    wordIds: [],
    ...over,
  }) as PackItem;

test("itemi corecți: nicio problemă", () => {
  expect(packProblems([espr(), falso(), story()], levelOf)).toEqual([]);
});

test("același id de două ori", () => {
  expect(packProblems([espr(), espr()], levelOf)).toContain("espr-a: id-ul apare de două ori");
});

test("prefixul id-ului trebuie să corespundă categoriei", () => {
  expect(packProblems([espr({ id: "sap-x" })], levelOf).join("\n")).toContain("prefixul „espr-”");
});

test("nivelul lipsește la o expresie, iar B2 nu e permis", () => {
  expect(packProblems([espr({ level: undefined })], levelOf).join("\n")).toContain("nivelul lipsește");
  expect(packProblems([espr({ level: "B2" })], levelOf).join("\n")).toContain("nivel A1–B1");
});

test("prietenul fals: nivelul se calculează, nu se scrie; are cel puțin un cuvânt", () => {
  expect(packProblems([falso({ level: "A1" })], levelOf).join("\n")).toContain("nivelul se calculează din dicționar");
  expect(packProblems([falso({ wordIds: [] })], levelOf).join("\n")).toContain("cel puțin un cuvânt");
});

test("cuvânt inexistent în dicționar", () => {
  expect(packProblems([espr({ wordIds: ["n-inexistent"] })], levelOf).join("\n")).toContain("cuvântul „n-inexistent” nu există");
});

test("testul: răspuns în afara variantelor sau variante identice", () => {
  const quiz = (options: string[], answer: number) => ({ question: loc("Cosa significa?"), options, answer });
  expect(packProblems([espr({ quiz: quiz(["Crepi!", "Grazie", "Anche tu"], 3) })], levelOf).join("\n")).toContain("răspunsul");
  expect(packProblems([espr({ quiz: quiz(["Crepi!", " CREPI! ", "Anche tu"], 0) })], levelOf).join("\n")).toContain("variante identice");
  expect(packProblems([espr({ quiz: quiz(["Crepi!", "Grazie", "Anche tu"], 0) })], levelOf)).toEqual([]);
});

test("micro-poveste: 3–6 replici", () => {
  const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ speaker: i % 2 ? "lui" : "voce", it: `Riga ${i}.`, ro: `Rând ${i}.` }));
  expect(packProblems([story({ lines: lines(2) })], levelOf).join("\n")).toContain("3–6 replici");
  expect(packProblems([story({ lines: lines(7) })], levelOf).join("\n")).toContain("3–6 replici");
  expect(packProblems([story({ lines: lines(6) })], levelOf)).toEqual([]);
});

test("micro-poveste: personaj necunoscut, voce comună, personaj fără replici, doi naratori", () => {
  const unknown = story({ lines: [{ speaker: "x", it: "A.", ro: "A." }, { speaker: "lui", it: "B.", ro: "B." }, { speaker: "voce", it: "C.", ro: "C." }] });
  expect(packProblems([unknown], levelOf).join("\n")).toContain("personaj necunoscut");

  const sameVoice = story({
    speakers: [
      { id: "voce", name: loc("N"), voice: "luca", narrator: true },
      { id: "lui", name: loc("M"), voice: "luca" },
    ],
  });
  expect(packProblems([sameVoice], levelOf).join("\n")).toContain("aceeași voce");

  const silent = story({
    speakers: [
      { id: "voce", name: loc("N"), voice: "francesco", narrator: true },
      { id: "lui", name: loc("M"), voice: "luca" },
      { id: "lei", name: loc("L"), voice: "sofia" },
    ],
  });
  expect(packProblems([silent], levelOf).join("\n")).toContain("nu are nicio replică");

  const twoNarrators = story({
    speakers: [
      { id: "voce", name: loc("N"), voice: "francesco", narrator: true },
      { id: "lui", name: loc("M"), voice: "luca", narrator: true },
    ],
  });
  expect(packProblems([twoNarrators], levelOf).join("\n")).toContain("cel mult un narator");
});

test("nivelul unui prieten fals vine din dicționar; al unei expresii e cel scris, indiferent de cuvintele ei", () => {
  expect(resolvePackLevel(falso({ wordIds: ["v-salire"] }), levelOf)).toBe("A2");
  expect(resolvePackLevel(falso({ wordIds: ["n-fattoria"] }), levelOf)).toBe("C1");
  expect(resolvePackLevel(espr({ level: "A1", wordIds: ["n-lupo"] }), levelOf)).toBe("A1");
});

test("un modo di dire valid, inclusiv B2 și fără echivalent la «different»", () => {
  expect(packProblems([modo(), modo({ id: "modo-x", level: "B2" })], levelOf)).toEqual([]);
});

test("modo di dire: C1 respins, B2 permis doar lui", () => {
  expect(packProblems([modo({ level: "C1" })], levelOf).join("\n")).toContain("nivel A1–B2 (nu C1)");
  expect(packProblems([espr({ level: "B2" })], levelOf).join("\n")).toContain("nivel A1–B1");
});

test("modo di dire: test și cuvânt obligatorii", () => {
  expect(packProblems([modo({ quiz: undefined })], levelOf).join("\n")).toContain("are obligatoriu un test");
  expect(packProblems([modo({ wordIds: [] })], levelOf).join("\n")).toContain("cel puțin un cuvânt în wordIds");
});

test("modo di dire: «same» și «twist» cer echivalentul", () => {
  expect(packProblems([modo({ match: "same" })], levelOf).join("\n")).toContain("echivalentul românesc e obligatoriu");
  expect(packProblems([modo({ match: "twist" })], levelOf).join("\n")).toContain("echivalentul românesc e obligatoriu");
  expect(packProblems([modo({ match: "twist", roEquivalent: "a fi în al nouălea cer" })], levelOf)).toEqual([]);
});

test("schema: «match» necunoscut e respins", () => {
  expect(packItemSchema.safeParse({ ...modo(), match: "similar" }).success).toBe(false);
});
