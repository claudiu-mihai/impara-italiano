import { expect, test } from "vitest";
import { audioFileName } from "./dialogueAudio.ts";
import { recordingsIndex, wordAudioJobs } from "./wordAudio.ts";

type W = Parameters<typeof wordAudioJobs>[0][number];
const word = (it: string, level: W["level"], extra: Partial<W> = {}): W => ({ it, level, pos: "verb", ...extra }) as W;

const WORDS = [
  word("essere", "A1"),
  word("caffè", "A1", { pos: "noun", article: "il" }),
  word("acqua", "A1", { pos: "noun", article: "l'" }),
  word("calcio", "A1", { pos: "noun", article: "il" }),
  word("calcio", "A1", { pos: "noun", article: "il" }), // omograf: același text, un singur fișier
  word("sviluppare", "B1"),
];

test("cuvintele A1–B2, cu textul rostit în aplicație (substantivele cu articol), vocea lui Francesco, fără dubluri", () => {
  expect(wordAudioJobs(WORDS)).toEqual([
    { voice: "francesco", text: "essere", file: audioFileName("francesco", "essere") },
    { voice: "francesco", text: "il caffè", file: audioFileName("francesco", "il caffè") },
    { voice: "francesco", text: "l'acqua", file: audioFileName("francesco", "l'acqua") },
    { voice: "francesco", text: "il calcio", file: audioFileName("francesco", "il calcio") },
    { voice: "francesco", text: "sviluppare", file: audioFileName("francesco", "sviluppare") },
  ]);
});

test("indexul: textul rostit → fișierul (relativ la /audio/), doar pentru fișierele existente", () => {
  const existing = new Set([audioFileName("francesco", "essere"), audioFileName("francesco", "l'acqua")]);
  expect(recordingsIndex(WORDS, (file) => existing.has(file))).toEqual({
    essere: `words/${audioFileName("francesco", "essere")}`,
    "l'acqua": `words/${audioFileName("francesco", "l'acqua")}`,
  });
});
