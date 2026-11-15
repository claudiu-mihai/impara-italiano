import { expect, test } from "vitest";
import { loadContent } from "./content.ts";

// Dialogurile din content/dialogues/ (aceleași date ca `npm run build:data`)
const { dialogues, errors } = loadContent();

const TOPICS = [
  "saluturi-si-politete",
  "la-bar",
  "mesele-zilei",
  "piata-si-supermarket",
  "directii",
  "ora",
  "familia",
  "la-hotel",
  "gara-si-aeroport",
  "la-medic-si-farmacie",
];

test("dialogurile sunt valide", () => {
  expect(errors).toEqual([]);
});

test("câte un dialog pe fiecare din cele 10 teme uzuale", () => {
  expect(dialogues).toHaveLength(10);
  expect(dialogues.map((d) => d.topicId).sort()).toEqual([...TOPICS].sort());
});

test("7 dialoguri A1 și 3 A2, fiecare cu 4–8 replici", () => {
  expect(dialogues.filter((d) => d.level === "A1")).toHaveLength(7);
  expect(dialogues.filter((d) => d.level === "A2")).toHaveLength(3);
  for (const d of dialogues) {
    expect(d.lines.length, d.id).toBeGreaterThanOrEqual(4);
    expect(d.lines.length, d.id).toBeLessThanOrEqual(8);
  }
});

test("fiecare dialog are cel puțin o replică în care genul personajului schimbă forma", () => {
  for (const d of dialogues) {
    expect(d.lines.some((l) => /\{[^{}|]*\|[^{}|]*\}/.test(l.it)), d.id).toBe(true);
  }
});
