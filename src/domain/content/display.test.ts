import { expect, test } from "vitest";
import { italianText } from "./display.ts";
import type { Word } from "./schema.ts";

const base = { tags: [], rank: 1, examples: [{ it: "x", ro: "y" }] };

test("substantivele se afișează cu articolul", () => {
  const libro = { ...base, id: "n-libro", it: "libro", ro: "carte", pos: "noun", gender: "m", article: "il", plural: "libri", pluralArticle: "i", irregularPlural: false } as unknown as Word;
  const amico = { ...base, id: "n-amico", it: "amico", ro: "prieten", pos: "noun", gender: "m", article: "l'", plural: "amici", pluralArticle: "gli", irregularPlural: false } as unknown as Word;
  expect(italianText(libro)).toBe("il libro");
  expect(italianText(amico)).toBe("l'amico");
});

test("celelalte categorii se afișează neschimbat", () => {
  const verb = { ...base, id: "v-parlare", it: "parlare", ro: "a vorbi", pos: "verb" } as unknown as Word;
  expect(italianText(verb)).toBe("parlare");
});
