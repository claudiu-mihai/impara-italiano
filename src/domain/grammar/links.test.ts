import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { GRAMMAR_LINKS, lessonForTense, lessonForWord, linkedLessonIds } from "./links.ts";

const irregular = new Set(["v-andare", "v-essere"]);

test("lessonForWord", () => {
  // doar verbele regulate au link din fișa cuvântului
  expect(lessonForWord("noun", "n-libro", irregular)).toBeUndefined();
  expect(lessonForWord("adjective", "a-rosso", irregular)).toBeUndefined();
  expect(lessonForWord("verb", "v-parlare", irregular)).toBe("presente-regolare");
  // fișa unui verb neregulat la prezent nu are link (lecția trimite deja la lista lor din Dicționar)
  expect(lessonForWord("verb", "v-andare", irregular)).toBeUndefined();
  expect(lessonForWord("adverb", "x-bene", irregular)).toBeUndefined();
});

test("lessonForTense: doar prezentul are lecție deocamdată", () => {
  expect(lessonForTense("presente", "v-nascere", irregular)).toBe("presente-regolare");
  expect(lessonForTense("presente", "v-essere", irregular)).toBe("presente-irregolare");
  expect(lessonForTense("imperfetto", "v-andare", irregular)).toBeUndefined();
  expect(GRAMMAR_LINKS.tense.presente).toBe("presente-regolare");
});

test("toate id-urile din GRAMMAR_LINKS există în content/grammar", () => {
  const dir = resolve(import.meta.dirname, "../../../content/grammar");
  const ids = new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => (JSON.parse(readFileSync(resolve(dir, f), "utf8")) as { id: string }).id),
  );
  expect(linkedLessonIds().filter((id) => !ids.has(id))).toEqual([]);
  expect(linkedLessonIds()).toContain(GRAMMAR_LINKS.verbRegular);
});
