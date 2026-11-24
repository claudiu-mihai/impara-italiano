import { expect, test } from "vitest";
import { audioFileName } from "./dialogueAudio.ts";
import { grammarAudioJobs, grammarRecordingsIndex } from "./grammarAudio.ts";

const GRAMMAR = [
  { items: [{ it: "il libro" }, { it: "la casa" }] },
  { items: [{ it: "il libro" }, { it: "sono stanco" }] },
];

test("frazele exercițiilor, fără dubluri, cu vocea lui Francesco", () => {
  expect(grammarAudioJobs(GRAMMAR)).toEqual([
    { voice: "francesco", text: "il libro", file: audioFileName("francesco", "il libro") },
    { voice: "francesco", text: "la casa", file: audioFileName("francesco", "la casa") },
    { voice: "francesco", text: "sono stanco", file: audioFileName("francesco", "sono stanco") },
  ]);
});

test("indexul: doar frazele cu fișier, relativ la /audio/", () => {
  const existing = new Set([audioFileName("francesco", "la casa")]);
  expect(grammarRecordingsIndex(GRAMMAR, (file) => existing.has(file))).toEqual({ "la casa": `words/${audioFileName("francesco", "la casa")}` });
});
