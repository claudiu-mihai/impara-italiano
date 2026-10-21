import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { grammarTopicSchema, type GrammarItem } from "../content/schema.ts";
import { gapPositions, splitAtGap } from "./gap.ts";
import { buildGrammarMatchRounds, GRAMMAR_PAIRS_PER_ROUND, GRAMMAR_SESSION_SIZE, gradeGap, pickSession } from "./games.ts";

const item = (n: number, it = `Io sono ${n}.`, gap = "sono"): GrammarItem => ({ id: `t-${n}`, it, gap, ro: `ro ${n}` });
const items = Array.from({ length: 24 }, (_, i) => item(i));

test("lacuna: cuvânt întreg la început, la mijloc sau articol cu apostrof", () => {
  expect(splitAtGap("Io sono italiano.", "sono")).toEqual({ before: "Io ", after: " italiano." });
  expect(splitAtGap("il libro", "il")).toEqual({ before: "", after: " libro" });
  expect(splitAtGap("l'amico", "l'")).toEqual({ before: "", after: "amico" });
  expect(splitAtGap("Dove sei?", "sei")).toEqual({ before: "Dove ", after: "?" });
  expect(splitAtGap("È tardi.", "È")).toEqual({ before: "", after: " tardi." });
});

test("lacuna: nu se potrivește în interiorul altui cuvânt și trebuie să fie unică", () => {
  // „un” nu este un cuvânt întreg în „una” sau „un'amica”
  expect(gapPositions("una casa", "un")).toEqual([]);
  expect(gapPositions("un'amica", "un")).toEqual([]);
  expect(splitAtGap("un'amica", "un'")).toEqual({ before: "", after: "amica" });
  // „ho” nu apare în „hanno”; de două ori înseamnă ambiguu
  expect(splitAtGap("Loro hanno", "ho")).toBeUndefined();
  expect(splitAtGap("ho ho", "ho")).toBeUndefined();
});

test("sesiunea: 10 exemple distincte din temă", () => {
  const session = pickSession(items);
  expect(session).toHaveLength(GRAMMAR_SESSION_SIZE);
  expect(new Set(session.map((i) => i.id)).size).toBe(GRAMMAR_SESSION_SIZE);
  expect(pickSession(items.slice(0, 4))).toHaveLength(4);
});

test("potrivire: runde de câte 5 perechi, fără exemple repetate", () => {
  const rounds = buildGrammarMatchRounds(items);
  expect(rounds).toHaveLength(GRAMMAR_SESSION_SIZE / GRAMMAR_PAIRS_PER_ROUND);
  expect(rounds.every((r) => r.length === GRAMMAR_PAIRS_PER_ROUND)).toBe(true);
  const ids = rounds.flat().map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(rounds.flat()[0]).toEqual({ id: expect.any(String), it: expect.any(String), ro: expect.any(String) });
});

test("corectare: accentul contează („e” nu înlocuiește „è”)", () => {
  expect(gradeGap(" È ", { gap: "è" })).toBe("correct");
  expect(gradeGap("e", { gap: "è" })).toBe("almost");
  expect(gradeGap("sei", { gap: "è" })).toBe("wrong");
  expect(gradeGap("", { gap: "è" })).toBe("wrong");
});

test("conținutul din content/grammar este valid, cu ordine unică și lacune corecte", () => {
  const dir = resolve(import.meta.dirname, "../../../content/grammar");
  const topics = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => grammarTopicSchema.parse(JSON.parse(readFileSync(resolve(dir, f), "utf8"))));
  expect(topics.length).toBeGreaterThanOrEqual(3);
  expect(new Set(topics.map((t) => t.order)).size).toBe(topics.length);
  expect(topics.sort((a, b) => a.order - b.order).map((t) => t.id).slice(0, 3)).toEqual(["articoli", "essere", "avere"]);
  for (const topic of topics) {
    expect(new Set(topic.items.map((i) => i.ro)).size, `${topic.id}: traduceri duplicate`).toBe(topic.items.length);
    for (const i of topic.items) expect(splitAtGap(i.it, i.gap), `${i.id}: lacună invalidă`).toBeDefined();
  }
});
