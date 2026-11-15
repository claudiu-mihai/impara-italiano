import { expect, test } from "vitest";
import { grammarTopicSchema, lessonBlockSchema, type GrammarItem } from "../content/schema.ts";
import { lessonProblems } from "./lessonCheck.ts";
import { markupError, parseInline, plainText } from "./markup.ts";

const TEN_ITEMS: GrammarItem[] = Array.from({ length: 10 }, (_, n) => ({
  id: `t-${n}`,
  it: `Io sono ${n}.`,
  gap: "sono",
  ro: `ro ${n}`,
}));

test("parseInline: italiană, bold și text simplu", () => {
  expect(parseInline("Cartea = [it]il libro[/it].")).toEqual([
    { text: "Cartea = " },
    { text: "il libro", it: true },
    { text: "." },
  ]);
  expect(parseInline("[b]înaintea[/b]")).toEqual([{ text: "înaintea", bold: true }]);
  expect(parseInline("fără marcaje")).toEqual([{ text: "fără marcaje" }]);
});

test("markupError: neînchis, imbricat, necunoscut", () => {
  expect(markupError("[it]il libro")).toMatch(/neînchis/);
  expect(markupError("[it][b]x[/b][/it]")).toMatch(/imbricat/);
  expect(markupError("[i]x[/i]")).toMatch(/necunoscut/);
  expect(markupError("[/it]x")).toMatch(/neînchis|fără deschidere/);
  expect(markupError("[it]a[/it] și [b]b[/b]")).toBeUndefined();
});

test("plainText scoate marcajele", () => {
  expect(plainText("[it]lo[/it] înaintea [b]s[/b]")).toBe("lo înaintea s");
});

test("lessonBlockSchema: tabel cu rânduri inegale și exemple goale sunt refuzate", () => {
  expect(lessonBlockSchema.safeParse({ type: "table", head: ["a", "b"], rows: [["1"]] }).success).toBe(false);
  expect(lessonBlockSchema.safeParse({ type: "table", head: ["a", "b"], rows: [["1", "2"]] }).success).toBe(true);
  expect(lessonBlockSchema.safeParse({ type: "examples", items: [] }).success).toBe(false);
  expect(lessonBlockSchema.safeParse({ type: "trap", ro: "x", it: "x" }).success).toBe(true);
  expect(lessonBlockSchema.safeParse({ type: "video", ro: "x" }).success).toBe(false);
});

test("lesson: cel puțin un bloc examples", () => {
  const base = { id: "t", order: 9, title: { it: "T", ro: "T" }, level: "A1", rules: [{ it: "r", ro: "r" }], items: TEN_ITEMS };
  const noExamples = [
    { type: "text", ro: "a", it: "a" },
    { type: "text", ro: "b", it: "b" },
    { type: "trap", ro: "c", it: "c" },
  ];
  const withExamples = [...noExamples, { type: "examples", items: [{ it: "il libro", ro: "cartea" }] }];
  expect(grammarTopicSchema.safeParse({ ...base, lesson: noExamples }).success).toBe(false);
  expect(grammarTopicSchema.safeParse({ ...base, lesson: withExamples }).success).toBe(true);
});

const topicWith = (lesson: unknown[], rules = [{ it: "r", ro: "r" }]) =>
  grammarTopicSchema.parse({ id: "t", order: 9, title: { it: "T", ro: "T" }, level: "A1", lesson, rules, items: TEN_ITEMS });
const TRAP = { type: "trap", ro: "c", it: "c" };
const EXAMPLES = { type: "examples", items: [{ it: "il libro", ro: "cartea" }] };

test("lessonProblems: lecție corectă → nicio problemă", () => {
  const topic = topicWith([{ type: "text", ro: "[it]il[/it] și [b]lo[/b]", it: "[it]il[/it] e [b]lo[/b]" }, TRAP, EXAMPLES]);
  expect(lessonProblems(topic)).toEqual([]);
});

test("lessonProblems: marcaj greșit în text, capcană sau notă", () => {
  const topic = topicWith([
    { type: "text", ro: "[it]neînchis", it: "ok" },
    TRAP,
    { type: "examples", items: [{ it: "il libro", ro: "cartea", note: "[i]x[/i]", noteIt: "ok" }] },
  ]);
  expect(lessonProblems(topic)).toEqual([
    expect.stringMatching(/^blocul 1: .*neînchis/),
    expect.stringMatching(/^blocul 3: .*necunoscut/),
  ]);
});

test("lessonProblems: marcajele nu au voie unde textul se afișează neprelucrat", () => {
  const topic = topicWith(
    [
      { type: "table", caption: "[b]x[/b]", captionIt: "x", head: ["a", "b"], rows: [["[it]il[/it]", "b"]] },
      TRAP,
      { type: "examples", items: [{ it: "[it]il libro[/it]", ro: "cartea" }] },
    ],
    [{ it: "regola", ro: "[b]regula[/b]" }],
  );
  const problems = lessonProblems(topic);
  expect(problems).toEqual([expect.stringMatching(/^blocul 1:/), expect.stringMatching(/^blocul 3:/), expect.stringMatching(/^regula 1:/)]);
  expect(problems.every((p) => /marcajele nu se afișează aici/.test(p))).toBe(true);
});

test("lessonProblems: itColumns în afara tabelului și exemple duplicate", () => {
  const topic = topicWith([
    { type: "table", head: ["a", "b"], rows: [["1", "2"]], itColumns: [2] },
    TRAP,
    { type: "examples", items: [{ it: "il libro", ro: "cartea" }, { it: "il libro", ro: "o carte" }] },
  ]);
  expect(lessonProblems(topic)).toEqual([
    expect.stringMatching(/^blocul 1: coloana 2/),
    expect.stringMatching(/^blocul 3: exemplul „il libro” apare de două ori/),
  ]);
});

test("lecția în italiană: fiecare explicație are perechea italiană, cu aceeași formă", () => {
  expect(lessonBlockSchema.safeParse({ type: "text", ro: "x" }).success).toBe(false);
  expect(lessonBlockSchema.safeParse({ type: "trap", ro: "x" }).success).toBe(false);
  const examples = (item: object) => lessonBlockSchema.safeParse({ type: "examples", items: [{ it: "il", ro: "-ul", ...item }] }).success;
  expect(examples({ note: "n" })).toBe(false);
  expect(examples({ note: "n", noteIt: "n" })).toBe(true);
  const table = (extra: object) => lessonBlockSchema.safeParse({ type: "table", head: ["a", "b"], rows: [["1", "2"]], ...extra }).success;
  expect(table({ caption: "c" })).toBe(false);
  expect(table({ caption: "c", captionIt: "c" })).toBe(true);
  expect(table({ headIt: ["a"] })).toBe(false);
  expect(table({ rowsIt: [["1"]] })).toBe(false);
  expect(table({ headIt: ["a", "b"], rowsIt: [["uno", "2"]] })).toBe(true);
});

test("lessonProblems: marcajele se verifică și în textul italian", () => {
  const topic = topicWith([{ type: "text", ro: "ok", it: "[it]non chiuso" }, TRAP, EXAMPLES]);
  expect(lessonProblems(topic)).toEqual([expect.stringMatching(/^blocul 1: .*neînchis/)]);
});

test("titlul și regulile au ambele limbi", () => {
  const base = { id: "t", order: 9, level: "A1", lesson: [TRAP, TRAP, EXAMPLES], items: TEN_ITEMS };
  expect(grammarTopicSchema.safeParse({ ...base, title: "T", rules: [{ it: "r", ro: "r" }] }).success).toBe(false);
  expect(grammarTopicSchema.safeParse({ ...base, title: { it: "T", ro: "T" }, rules: ["r"] }).success).toBe(false);
  expect(grammarTopicSchema.safeParse({ ...base, title: { it: "T", ro: "T" }, rules: [{ it: "r", ro: "r" }] }).success).toBe(true);
});
