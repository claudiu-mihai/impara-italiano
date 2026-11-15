import { expect, test } from "vitest";
import type { Dialogue } from "../content/schema.ts";
import { dialogueProblems } from "./check.ts";

const TOPICS = new Set(["la-bar"]);

function dialogue(overrides: Partial<Dialogue> = {}): Dialogue {
  return {
    id: "la-bar-01",
    topicId: "la-bar",
    title: { it: "Un caffè, per favore", ro: "O cafea, vă rog" },
    canDo: { it: "So ordinare al bar", ro: "Pot să comand la bar" },
    speakers: [
      { id: "barista", name: { it: "Barista", ro: "Barmanul" } },
      { id: "cliente", name: { it: "Tu", ro: "Tu" } },
    ],
    you: "cliente",
    lines: [
      { speaker: "barista", it: "Buongiorno! Cosa prende?", ro: "Bună ziua! Ce doriți?" },
      { speaker: "cliente", it: "Un caffè, per favore.", ro: "O cafea, vă rog." },
      { speaker: "barista", it: "Ecco a Lei.", ro: "Poftiți." },
      { speaker: "cliente", it: "Grazie!", ro: "Mulțumesc!" },
    ],
    ...overrides,
  };
}

const line = (speaker: string) => ({ speaker, it: "Sì.", ro: "Da." });

test("un dialog valid nu are probleme", () => {
  expect(dialogueProblems(dialogue(), TOPICS)).toEqual([]);
});

test("tema trebuie să existe", () => {
  expect(dialogueProblems(dialogue({ topicId: "la-luna" }), TOPICS)).toEqual(["la-bar-01: tema „la-luna” nu există"]);
});

test("4–8 replici", () => {
  const short = dialogue({ lines: dialogue().lines.slice(0, 3) });
  expect(dialogueProblems(short, TOPICS)).toContain("la-bar-01: 3 replici (între 4 și 8)");
  const long = dialogue({ lines: [...dialogue().lines, ...dialogue().lines, line("barista")] });
  expect(dialogueProblems(long, TOPICS)).toContain("la-bar-01: 9 replici (între 4 și 8)");
});

test("rolul cursantului e unul dintre personaje", () => {
  expect(dialogueProblems(dialogue({ you: "cameriere" }), TOPICS)).toContain("la-bar-01: „you” (cameriere) nu e un personaj");
});

test("personajele au id-uri diferite", () => {
  const same = dialogue({
    speakers: [
      { id: "barista", name: { it: "Barista", ro: "Barmanul" } },
      { id: "barista", name: { it: "Tu", ro: "Tu" } },
    ],
    you: "barista",
  });
  expect(dialogueProblems(same, TOPICS)).toContain("la-bar-01: personajele au același id");
});

test("fiecare personaj are cel puțin 2 replici", () => {
  const lines = [line("barista"), line("barista"), line("barista"), line("cliente")];
  expect(dialogueProblems(dialogue({ lines }), TOPICS)).toContain("la-bar-01: cliente are doar 1 replici (minim 2)");
});

test("fiecare replică e a unui personaj", () => {
  const lines = [...dialogue().lines, line("cameriere")];
  expect(dialogueProblems(dialogue({ lines }), TOPICS)).toContain("la-bar-01: replica 5 e a unui personaj necunoscut (cameriere)");
});
