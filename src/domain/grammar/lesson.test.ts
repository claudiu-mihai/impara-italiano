import { expect, test } from "vitest";
import { grammarTopicSchema, lessonBlockSchema, type GrammarItem } from "../content/schema.ts";
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
  expect(lessonBlockSchema.safeParse({ type: "trap", ro: "x" }).success).toBe(true);
  expect(lessonBlockSchema.safeParse({ type: "video", ro: "x" }).success).toBe(false);
});

test("lesson: cel puțin un bloc examples", () => {
  const base = { id: "t", order: 9, title: "T", level: "A1", rules: ["r"], items: TEN_ITEMS };
  const noExamples = [
    { type: "text", ro: "a" },
    { type: "text", ro: "b" },
    { type: "trap", ro: "c" },
  ];
  const withExamples = [...noExamples, { type: "examples", items: [{ it: "il libro", ro: "cartea" }] }];
  expect(grammarTopicSchema.safeParse({ ...base, lesson: noExamples }).success).toBe(false);
  expect(grammarTopicSchema.safeParse({ ...base, lesson: withExamples }).success).toBe(true);
});
