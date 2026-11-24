import { expect, test } from "vitest";
import { seededRandom } from "../random.ts";
import type { CoreWord } from "../content/types.ts";
import { followUpGrid, planFollowUp } from "./followUp.ts";
import type { FeedItem } from "./types.ts";

const known = (n: number): FeedItem => ({ type: "knownWord", key: `word:${n}`, wordId: `n-${n}` });
const gap = (n: number): FeedItem => ({ type: "gap", key: `gap:${n}`, grammarId: "g", itemId: `i${n}`, options: ["a", "b", "c"], correctIndex: 0 });
const follow: FeedItem = {
  type: "grid",
  key: "grid:follow",
  question: { wordId: "n-1", cardId: "vocab:n-1:it-ro", direction: "it-ro", options: ["a", "b", "c", "d"], correctIndex: 0, listen: false, followUp: true },
};

test("grila de după un cuvânt nou apare la 4–8 carduri după cardul curent; lista crește cu unul", () => {
  const items = Array.from({ length: 20 }, (_, i) => known(i));
  for (let seed = 1; seed <= 30; seed++) {
    const out = planFollowUp(items, 2, follow, seededRandom(seed));
    expect(out).toHaveLength(items.length + 1);
    const at = out.indexOf(follow);
    expect(at).toBeGreaterThanOrEqual(2 + 4);
    expect(at).toBeLessThanOrEqual(2 + 8);
  }
});

test("dacă locul ales are un test alături, se mută la primul loc fără teste vecine", () => {
  // testele pe pozițiile 6, 7 și 8: orice loc între 5 și 9 ar fi lângă un test
  const items = Array.from({ length: 20 }, (_, i) => (i >= 6 && i <= 8 ? gap(i) : known(i)));
  for (let seed = 1; seed <= 30; seed++) {
    const out = planFollowUp(items, 2, follow, seededRandom(seed));
    const at = out.indexOf(follow);
    expect(out[at - 1]!.type).not.toBe("gap");
    expect(out[at + 1]?.type).not.toBe("gap");
  }
});

test("lista scurtă: grila ajunge la sfârșit", () => {
  const items = [known(0), known(1)];
  const out = planFollowUp(items, 0, follow, seededRandom(1));
  expect(out).toEqual([...items, follow]);
});

const pool: CoreWord[] = Array.from({ length: 20 }, (_, i) => ({
  id: `n-w${i}`,
  it: `parola${String.fromCharCode(97 + i)}`,
  ro: `cuvânt${String.fromCharCode(97 + i)}`,
  pos: "noun",
  rank: i + 1,
  level: "A1",
  article: "il",
}));

test("followUpGrid: 4 variante distincte cu răspunsul corect marcat, marcată ca grilă de după cuvânt nou", () => {
  const word = pool[3]!;
  const item = followUpGrid(word, "it-ro", pool, seededRandom(1))!;
  expect(item.type).toBe("grid");
  if (item.type !== "grid") return;
  expect(item.key).toContain(word.id);
  expect(item.question).toMatchObject({ wordId: word.id, cardId: "vocab:n-w3:it-ro", direction: "it-ro", followUp: true });
  expect(new Set(item.question.options).size).toBe(4);
  expect(item.question.options[item.question.correctIndex]).toBe(word.ro);
});

test("followUpGrid: fără destule variante greșite nu se face grilă", () => {
  expect(followUpGrid(pool[0]!, "it-ro", pool.slice(0, 2), seededRandom(1))).toBeUndefined();
});
