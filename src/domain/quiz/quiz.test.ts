import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import type { Word } from "../content/schema.ts";
import { newStoredCard } from "../srs/scheduler.ts";
import { vocabCardId, type StoredCard } from "../srs/types.ts";
import { buildQuizRound } from "./buildQuizRound.ts";
import { pickDistractors } from "./distractors.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function word(id: string, ro: string, rank: number, pos: Word["pos"] = "verb"): Word {
  return { id, it: id.slice(2), ro, pos, tags: [], rank, examples: [{ it: "x", ro: "y" }] } as unknown as Word;
}

const words = [
  word("v-parlare", "a vorbi", 1),
  word("v-dire", "a spune", 2),
  word("v-andare", "a merge", 3),
  word("v-venire", "a veni", 4),
  word("v-vedere", "a vedea", 5),
  word("v-vedere2", "a vedea", 6), // aceeași traducere ca v-vedere
  word("v-prendere", "a lua masa", 7),
  word("v-mettere", "a lua o decizie", 8), // are cuvântul „lua” în comun cu v-prendere
  word("a-bello", "frumos", 9, "adjective"),
];

test("distractorii nu repetă răspunsul corect și nu au traduceri identice între ei", () => {
  const target = words[4]!; // a vedea
  const picked = pickDistractors({ target, pool: words, direction: "it-ro" });
  expect(picked).toHaveLength(3);
  const texts = picked.map((w) => w.ro);
  expect(texts).not.toContain("a vedea");
  expect(new Set(texts).size).toBe(3);
});

test("distractorii nu au cuvinte în comun cu răspunsul corect", () => {
  const picked = pickDistractors({ target: words[6]!, pool: words, direction: "it-ro", count: 5 });
  expect(picked.map((w) => w.id)).not.toContain("v-mettere");
});

test("preferă aceeași categorie gramaticală", () => {
  const picked = pickDistractors({ target: words[0]!, pool: words, direction: "it-ro", count: 3 });
  expect(picked.every((w) => w.pos === "verb")).toBe(true);
});

test("completează din alte categorii când nu sunt destule", () => {
  const small = [words[0]!, words[1]!, words[8]!];
  const picked = pickDistractors({ target: words[0]!, pool: small, direction: "it-ro" });
  expect(picked.map((w) => w.id).sort()).toEqual(["a-bello", "v-dire"]);
});

function card(wordId: string, over: Partial<StoredCard> = {}): StoredCard {
  return {
    ...newStoredCard({ cardId: vocabCardId(wordId, "it-ro"), wordId, kind: "vocab", variant: "it-ro" }, NOW, "2026-10-01"),
    state: State.Review,
    due: new Date(NOW.getTime() + 5 * DAY),
    stability: 10,
    ...over,
  };
}

test("runda de quiz: întâi cardurile scadente, apoi cele mai slabe", () => {
  const cards = [
    card("v-dire", { stability: 50 }),
    card("v-parlare", { due: new Date(NOW.getTime() - 3 * DAY) }),
    card("v-andare", { stability: 2 }),
  ];
  const round = buildQuizRound({ now: NOW, direction: "it-ro", cards, words, size: 3 });
  expect(round.map((q) => q.wordId)).toEqual(["v-parlare", "v-andare", "v-dire"]);
});

test("fiecare întrebare are 4 variante distincte, iar indexul corect arată răspunsul", () => {
  const round = buildQuizRound({ now: NOW, direction: "it-ro", cards: [card("v-parlare")], words });
  const q = round[0]!;
  expect(q.options).toHaveLength(4);
  expect(new Set(q.options).size).toBe(4);
  expect(q.options[q.correctIndex]).toBe("a vorbi");
});

test("fără carduri introduse nu există întrebări; ignoră cardurile din cealaltă direcție", () => {
  expect(buildQuizRound({ now: NOW, direction: "it-ro", cards: [], words })).toEqual([]);
  const other = { ...card("v-dire"), variant: "ro-it" };
  expect(buildQuizRound({ now: NOW, direction: "it-ro", cards: [other], words })).toEqual([]);
});

test("în direcția RO → IT variantele sunt în italiană", () => {
  const c = { ...card("v-parlare"), variant: "ro-it", cardId: vocabCardId("v-parlare", "ro-it") };
  const q = buildQuizRound({ now: NOW, direction: "ro-it", cards: [c], words })[0]!;
  expect(q.options[q.correctIndex]).toBe("parlare");
});
