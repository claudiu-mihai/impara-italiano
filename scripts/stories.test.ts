import { expect, test } from "vitest";
import { loadContent } from "./content.ts";

// Poveștile din content/stories/ (aceleași date ca `npm run build:data`)
const { stories, errors } = loadContent();

test("poveștile sunt valide", () => {
  expect(errors).toEqual([]);
});

test("pauza la bar și weekendul pe zăpadă, ambele A2", () => {
  expect(stories.map((s) => s.id)).toEqual(["un-weekend-sulla-neve-01", "una-pausa-al-bar-01"]);
  expect(stories.every((s) => s.level === "A2")).toBe(true);
});

test("pauza la bar: narator Francesco, Marta = Sofia, Elena = Giullia", () => {
  const bar = stories.find((s) => s.id === "una-pausa-al-bar-01")!;
  expect(bar.speakers.map((s) => [s.id, s.voice, s.narrator ?? false])).toEqual([
    ["narratore", "francesco", true],
    ["marta", "sofia", false],
    ["elena", "giullia", false],
  ]);
  expect(bar.scenes.flatMap((s) => s.lines)).toHaveLength(22);
});

test("weekendul pe zăpadă: 4 personaje, 4 scene cu titlu", () => {
  const neve = stories.find((s) => s.id === "un-weekend-sulla-neve-01")!;
  expect(neve.speakers.map((s) => s.id)).toEqual(["elena", "giulia", "marco", "paolo"]);
  expect(neve.scenes).toHaveLength(4);
  expect(neve.scenes.every((s) => s.title)).toBe(true);
});
