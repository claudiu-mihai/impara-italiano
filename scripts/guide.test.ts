import { expect, test } from "vitest";
import { isUpTo } from "../src/domain/content/levels.ts";
import { guidedWordIds } from "../src/domain/session/guidedOrder.ts";
import { loadContent } from "./content.ts";

// Calea de supraviețuire, din sursele din content/ (aceleași date ca `npm run build:data`)
const { topics, words, errors } = loadContent();
const levelOf = new Map(words.map((w) => [w.id, w.level]));
const guide = topics.map((t) => ({
  id: t.id,
  level: t.level,
  ...(t.path !== undefined ? { path: t.path } : {}),
  wordIds: [...new Set(t.subgroups.flatMap((s) => s.wordIds))],
}));
const onPath = guide.filter((t) => t.path !== undefined).sort((a, b) => a.path! - b.path!);

test("conținutul e valid", () => {
  expect(errors).toEqual([]);
});

test("calea de supraviețuire are teme numerotate 1, 2, 3… fără goluri și începe cu saluturile", () => {
  expect(onPath.map((t) => t.path)).toEqual(onPath.map((_, i) => i + 1));
  expect(onPath[0]!.id).toBe("saluturi-si-politete");
  expect(onPath.map((t) => t.id)).toContain("la-bar");
});

test("toate temele din cale și toate cuvintele lor sunt A1: se pot introduce de la început", () => {
  for (const t of onPath) {
    expect(t.level, t.id).toBe("A1");
    for (const id of t.wordIds) expect(isUpTo(levelOf.get(id)!, "A1"), `${t.id}: ${id}`).toBe(true);
  }
});

test("primele șase teme din cale dau cam două săptămâni de cuvinte noi (10 pe zi)", () => {
  const firstSix = new Set(onPath.slice(0, 6).flatMap((t) => t.wordIds));
  expect(firstSix.size).toBeGreaterThanOrEqual(120);
  expect(firstSix.size).toBeLessThanOrEqual(160);
  expect(guidedWordIds(guide, new Set()).slice(0, 5)).toEqual(onPath[0]!.wordIds.slice(0, 5));
});

test("temele uzuale au nivelul A1: la bar, mesele, piața, familia", () => {
  for (const id of ["la-bar", "mesele-zilei", "piata-si-supermarket", "familia"]) {
    expect(guide.find((t) => t.id === id)?.level, id).toBe("A1");
  }
});
