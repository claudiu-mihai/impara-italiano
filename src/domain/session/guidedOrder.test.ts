import { expect, test } from "vitest";
import { guidedWordIds, mergeGuided, type GuideTopic } from "./guidedOrder.ts";

const topic = (id: string, wordIds: string[], path?: number): GuideTopic => ({ id, level: "A1", wordIds, ...(path ? { path } : {}) });
const none = new Set<string>();

test("calea: cuvintele temelor cu `path`, în ordinea numerelor, fără duplicate și fără temele din afara căii", () => {
  const guide = [
    topic("c", ["x1", "x2"]), // fără path
    topic("b", ["b1", "a2", "b2"], 2),
    topic("a", ["a1", "a2"], 1),
  ];
  expect(guidedWordIds(guide, none)).toEqual(["a1", "a2", "b1", "b2"]);
});

test("cuvintele deja începute nu apar", () => {
  const guide = [topic("a", ["a1", "a2", "a3"], 1)];
  expect(guidedWordIds(guide, new Set(["a1"]))).toEqual(["a2", "a3"]);
});

test("tema începută (cel puțin 2 cuvinte și un sfert din ea) trece înaintea căii, chiar dacă nu e pe cale", () => {
  const guide = [
    topic("p1", ["p1a", "p1b"], 1),
    topic("started", ["s1", "s2", "s3", "s4", "s5", "s6"]),
  ];
  expect(guidedWordIds(guide, new Set(["s1", "s2"]))).toEqual(["s3", "s4", "s5", "s6", "p1a", "p1b"]);
});

test("o temă cu un singur cuvânt cunoscut sau sub un sfert nu e „începută”", () => {
  const guide = [topic("p1", ["p1a"], 1), topic("big", Array.from({ length: 12 }, (_, i) => `b${i}`))];
  // 1 cuvânt dintr-o temă mare: prea puțin
  expect(guidedWordIds(guide, new Set(["b0"]))).toEqual(["p1a"]);
  // 2 din 12 e sub un sfert
  expect(guidedWordIds(guide, new Set(["b0", "b1"]))).toEqual(["p1a"]);
  // 3 din 12 e exact un sfert
  expect(guidedWordIds(guide, new Set(["b0", "b1", "b2"]))).toHaveLength(1 + 9);
  expect(guidedWordIds(guide, new Set(["b0", "b1", "b2"]))[0]).toBe("b3");
});

test("temele începute se ordonează după cât din ele e făcut, cele mai avansate întâi; o temă terminată nu mai contează", () => {
  const guide = [
    topic("less", ["l1", "l2", "l3", "l4"]),
    topic("more", ["m1", "m2", "m3", "m4"]),
    topic("done", ["d1", "d2"], 1),
  ];
  const known = new Set(["l1", "l2", "m1", "m2", "m3", "d1", "d2"]);
  expect(guidedWordIds(guide, known)).toEqual(["m4", "l3", "l4"]);
});

test("amestec 2:1: două cuvinte ghidate, unul după frecvență, fără duplicate", () => {
  const guided = [{ id: "g1" }, { id: "g2" }, { id: "g3" }, { id: "g4" }, { id: "f2" }];
  const frequency = [{ id: "f1" }, { id: "f2" }, { id: "f3" }];
  expect(mergeGuided(guided, frequency).map((w) => w.id)).toEqual(["g1", "g2", "f1", "g3", "g4", "f2", "f3"]);
});

test("amestec: când o listă se termină, continuă cealaltă", () => {
  expect(mergeGuided([], [{ id: "f1" }, { id: "f2" }]).map((w) => w.id)).toEqual(["f1", "f2"]);
  expect(mergeGuided([{ id: "g1" }, { id: "g2" }, { id: "g3" }], []).map((w) => w.id)).toEqual(["g1", "g2", "g3"]);
});
