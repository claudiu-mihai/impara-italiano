import { expect, test } from "vitest";
import type { CoreWord } from "./types.ts";
import { decodeWords, encodeWords, wordIdOf } from "./wordsCodec.ts";

const words: CoreWord[] = [
  { id: "v-essere", it: "essere", ro: "a fi", pos: "verb", rank: 1, level: "A1" },
  { id: "n-casa", it: "casa", ro: "casă", pos: "noun", rank: 2, level: "A1", article: "la" },
  { id: "e-che_ore_sono", it: "che ore sono", ro: "cât este ceasul", pos: "expression", rank: 3, level: "B1" },
];

test("codare și decodare: round-trip, rang din poziție, id din formă", () => {
  expect(decodeWords(encodeWords(words))).toEqual(words);
  expect(wordIdOf("expression", "l'altro ieri")).toBe("e-l'altro_ieri");
});

test("codarea refuză cuvinte al căror rang sau id nu se pot deduce", () => {
  expect(() => encodeWords([{ ...words[0]!, rank: 5 }])).toThrow();
  expect(() => encodeWords([{ ...words[0]!, id: "v-altceva" }])).toThrow();
});
