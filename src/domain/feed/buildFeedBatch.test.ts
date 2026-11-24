import { State } from "ts-fsrs";
import { describe, expect, test } from "vitest";
import type { GeneratedDialogue, GeneratedPackItem, GeneratedStory, GrammarTopic, Level, Word } from "../content/schema.ts";
import type { CoreWord } from "../content/types.ts";
import { seededRandom } from "../random.ts";
import type { SentenceItem } from "../sentence/sentenceRound.ts";
import type { SessionItem } from "../session/buildDailySession.ts";
import type { StoredCard } from "../srs/types.ts";
import { FEED_BATCH_SIZE, buildFeedBatch, type FeedSources, type FeedState } from "./buildFeedBatch.ts";
import type { FeedSeen, PackVisit } from "./pack.ts";
import { PACK_TYPES, TEST_TYPES, wordsOf, type FeedItem } from "./types.ts";

const NOW = new Date(2026, 10, 24, 12, 0, 0);
const loc = (it: string) => ({ it, ro: it });

// nume doar din litere: `pickDistractors` compară cuvintele după literele din text, iar cifrele ar face toate răspunsurile asemănătoare
const letters = (i: number) => String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26));

const words: CoreWord[] = Array.from({ length: 80 }, (_, i) => ({
  id: `n-w${i}`,
  it: `parola${letters(i)}`,
  ro: `cuvânt${letters(i)}`,
  pos: "noun",
  rank: i + 1,
  level: "A1",
  article: "il",
}));

const details = new Map(
  words.map((w, i) => [w.id, { ...w, ...(i >= 8 && i % 4 === 0 ? { note: `nota ${i}` } : {}), examples: [{ it: "x", ro: "y" }] } as unknown as Word]),
);

const card = (wordId: string, over: Partial<StoredCard> = {}): StoredCard =>
  ({
    cardId: `vocab:${wordId}:it-ro`,
    wordId,
    kind: "vocab",
    variant: "it-ro",
    introducedOn: "2026-11-01",
    due: new Date(NOW.getTime() + 5 * 86_400_000),
    stability: 10,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 5,
    learning_steps: 0,
    reps: 3,
    lapses: 0,
    state: State.Review,
    ...over,
  }) as StoredCard;

/** Cuvintele 0–7 sunt începute și scadente (cele din coada de repetiții); 8–59, începute și nescadente; 60–79 nu. */
const startedCards = words
  .slice(0, 60)
  .map((w, i) => card(w.id, i < 8 ? { due: new Date(NOW.getTime() - 86_400_000) } : {}));

const sentences: SentenceItem[] = Array.from({ length: 40 }, (_, i) => ({
  id: `s${i}`,
  wordIds: [`n-w${i}`, `n-w${(i + 1) % 60}`],
  it: `frase ${i}`,
  ro: `propoziție ${i}`,
  tokens: ["a", "b", "c"],
  punctuation: ".",
  acceptedOrders: [[0, 1, 2]],
}));

const topic = (id: string, level: Level) =>
  ({
    id,
    level,
    title: loc(id),
    rules: Array.from({ length: 4 }, (_, i) => loc(`regola ${id} ${i}`)),
    items: Array.from({ length: 12 }, (_, i) => ({ id: `${id}-${i}`, it: `frase ${i} ${id}`, gap: `gap${i}${id}`, ro: "x" })),
  }) as unknown as GrammarTopic;

const dialogue = (id: string, level: Level) =>
  ({ id, topicId: "t", level, title: loc(id), canDo: loc(id), speakers: [], you: "a", lines: Array.from({ length: 6 }, (_, i) => ({ speaker: "a", it: `l${i}`, ro: `r${i}` })) }) as unknown as GeneratedDialogue;

const story = (id: string, level: Level) =>
  ({
    id,
    level,
    title: loc(id),
    speakers: [],
    scenes: [{ lines: Array.from({ length: 5 }, (_, i) => ({ speaker: "a", it: `s${i}`, ro: `t${i}` })) }, { lines: Array.from({ length: 4 }, (_, i) => ({ speaker: "a", it: `u${i}`, ro: `v${i}` })) }],
  }) as unknown as GeneratedStory;

const packItem = (i: number, level: Level = "A1"): GeneratedPackItem =>
  ({
    id: `espr-${i}`,
    kind: "espressione",
    level,
    it: `espr ${i}`,
    ro: `x ${i}`,
    explain: loc("x"),
    wordIds: [`n-w${70 + (i % 10)}`],
    quiz: { question: loc("?"), options: ["a", "b", "c"], answer: 0 },
  }) as GeneratedPackItem;

const SOURCES: FeedSources = {
  words,
  details,
  sentences,
  grammar: [topic("g1", "A1"), topic("g2", "A1"), topic("g3", "A1")],
  dialogues: [dialogue("d1", "A1"), dialogue("d2", "A1")],
  stories: [story("st1", "A1")],
  pack: Array.from({ length: 40 }, (_, i) => packItem(i)),
};

const queueOf = (n: number, isNew: boolean, from = 0): SessionItem[] =>
  Array.from({ length: n }, (_, i) => ({
    cardId: `vocab:n-w${from + i}:it-ro`,
    wordId: `n-w${from + i}`,
    variant: "it-ro",
    isNew,
  }));

const visit0 = (): PackVisit => ({ visitStart: NOW.getTime() - 1000, shownAt: new Map(), quizzed: new Set(), count: 0 });

interface Run {
  sources?: FeedSources;
  state?: Partial<FeedState>;
  seed?: number;
  batches?: number;
  size?: number;
}

/** Construiește mai multe loturi la rând, actualizând starea vizitei ca ecranul (chei arătate, pachet văzut, repere). */
function simulate({ sources = SOURCES, state = {}, seed = 1, batches = 1, size = FEED_BATCH_SIZE }: Run = {}): FeedItem[] {
  const random = seededRandom(seed);
  let seen: FeedSeen = state.seen ?? {};
  const shownAt = new Map<string, number>();
  const quizzed = new Set<string>();
  let shownKeys = new Set<string>();
  let recent: FeedItem[] = [];
  const all: FeedItem[] = [];
  for (let b = 0; b < batches; b++) {
    const batch = buildFeedBatch(
      sources,
      {
        now: NOW,
        level: "A2",
        queue: [],
        cards: startedCards,
        seen,
        recent,
        shownKeys,
        ...state,
        visit: { visitStart: NOW.getTime() - 1000, shownAt, quizzed, count: all.length },
      },
      random,
      size,
    );
    batch.forEach((item, i) => {
      if (item.type === "pack") {
        shownAt.set(item.packId, all.length + i);
        seen = { ...seen, [item.packId]: { ...seen[item.packId], shown: NOW.getTime() } };
      }
      if (item.type === "packQuiz") {
        quizzed.add(item.packId);
        seen = { ...seen, [item.packId]: { ...seen[item.packId], quizzed: NOW.getTime() } };
      }
      shownKeys.add(item.key);
    });
    all.push(...batch);
    recent = all.slice(-20);
    if (batch.some((i) => i.type === "endOfMaterial")) shownKeys = new Set();
  }
  return all;
}

const packMap = new Map(SOURCES.pack.map((p) => [p.id, p]));
const isTest = (item: FeedItem) => TEST_TYPES.has(item.type);

describe("regulile de ordine", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    test(`pe 300 de carduri, sămânța ${seed}`, () => {
      const all = simulate({ seed, batches: 20, state: { queue: queueOf(8, false, 0) } });
      expect(all).toHaveLength(300);

      let testRun = 0;
      let nonTestRun = 0;
      let typeRun = 1;
      all.forEach((item, i) => {
        // niciodată două teste la rând
        if (i > 0 && isTest(item) && isTest(all[i - 1]!)) throw new Error(`două teste la rând la ${i}`);
        testRun = isTest(item) ? testRun + 1 : 0;
        // cel mult 3 carduri fără test
        nonTestRun = isTest(item) ? 0 : nonTestRun + 1;
        expect(nonTestRun, `prea multe carduri fără test la ${i}`).toBeLessThanOrEqual(3);
        // același tip de cel mult 2 ori la rând (repetițiile: 3)
        typeRun = i > 0 && all[i - 1]!.type === item.type ? typeRun + 1 : 1;
        expect(typeRun, `${item.type} de ${typeRun} ori la rând la ${i}`).toBeLessThanOrEqual(item.type === "review" ? 3 : 2);
      });

      // același cuvânt de cel mult o dată la 10 carduri
      for (let i = 0; i < all.length; i++) {
        const mine = wordsOf(all[i]!, packMap);
        for (let j = Math.max(0, i - 9); j < i; j++) {
          const shared = wordsOf(all[j]!, packMap).filter((w) => mine.includes(w));
          expect(shared, `cuvântul ${shared[0]} la ${j} și ${i}`).toEqual([]);
        }
      }

      // nicio cheie de conținut repetată (între resetările de la „final de material”)
      const keys = new Set<string>();
      for (const item of all) {
        if (item.type === "endOfMaterial") keys.clear();
        else {
          expect(keys.has(item.key), `cheie repetată ${item.key}`).toBe(false);
          keys.add(item.key);
        }
      }
    });
  }

  test("primul card al vizitei nu e test", () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(isTest(simulate({ seed })[0]!)).toBe(false);
    }
  });
});

describe("compoziția", () => {
  test("pe 300 de carduri apar toate tipurile din conținut și teste", () => {
    const all = simulate({ batches: 20, state: { queue: queueOf(8, false, 0) } });
    const types = new Set(all.map((i) => i.type));
    for (const type of ["review", "knownWord", "sentence", "rule", "lines", "didYouKnow", "grid", "trueFalse", "gap", "pack", "packQuiz"] as const) {
      expect(types.has(type), type).toBe(true);
    }
  });

  test("grilele au 4 variante distincte, cu răspunsul corect marcat, iar adevărat/fals are ambele feluri", () => {
    const all = simulate({ batches: 20 });
    const byId = new Map(words.map((w) => [w.id, w]));
    for (const item of all) {
      if (item.type === "grid") {
        const q = item.question;
        expect(new Set(q.options).size).toBe(4);
        const word = byId.get(q.wordId)!;
        expect(q.options[q.correctIndex]).toBe(q.direction === "it-ro" ? word.ro : `${word.article} ${word.it}`);
        expect(q.followUp).toBe(false);
      }
      if (item.type === "gap") {
        expect(new Set(item.options).size).toBe(3);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
      }
    }
    const tf = all.filter((i): i is Extract<FeedItem, { type: "trueFalse" }> => i.type === "trueFalse");
    expect(tf.some((i) => i.isTrue)).toBe(true);
    expect(tf.some((i) => !i.isTrue)).toBe(true);
  });
});

describe("repetiții și cuvinte noi", () => {
  test("cu repetiții scadente, ele vin primele, în ordinea cozii", () => {
    const queue = queueOf(8, false, 0);
    for (const seed of [1, 2, 3]) {
      const batch = simulate({ seed, state: { queue } });
      const reviews = batch.filter((i): i is Extract<FeedItem, { type: "review" }> => i.type === "review");
      expect(reviews.length).toBeGreaterThanOrEqual(3);
      expect(reviews.length).toBeLessThanOrEqual(9);
      const order = reviews.map((r) => queue.findIndex((q) => q.cardId === r.item.cardId));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  test("instalare nouă: fără grile, adevărat/fals, propoziții sau cuvinte cunoscute; lotul are 15 carduri", () => {
    const batch = simulate({ state: { cards: [], queue: queueOf(10, true, 60) } });
    expect(batch).toHaveLength(FEED_BATCH_SIZE);
    for (const type of ["grid", "trueFalse", "sentence", "knownWord"] as const) {
      expect(batch.some((i) => i.type === type), type).toBe(false);
    }
    expect(isTest(batch[0]!)).toBe(false);
    expect(batch.some((i) => i.type === "newWord")).toBe(true);
  });

  test("limitele zilei atinse: fără repetiții și cuvinte noi, dar lotul are tot 15 carduri", () => {
    const batch = simulate({ state: { queue: [] } });
    expect(batch).toHaveLength(FEED_BATCH_SIZE);
    expect(batch.some((i) => i.type === "review" || i.type === "newWord")).toBe(false);
  });
});

describe("pachetul", () => {
  test("după primele 5 carduri, un card din pachet cel puțin o dată la 10 cât timp există eligibili", () => {
    for (const seed of [1, 2, 3]) {
      const all = simulate({ seed, batches: 8 });
      for (let start = 5; start + 10 <= all.length; start++) {
        const window = all.slice(start, start + 10);
        expect(window.some((i) => PACK_TYPES.has(i.type)), `fereastra de la ${start} (seed ${seed})`).toBe(true);
      }
    }
  });

  test("pachet consumat: niciun card de pachet, fără goluri", () => {
    const seen: FeedSeen = Object.fromEntries(SOURCES.pack.map((p) => [p.id, { shown: NOW.getTime() - 3_600_000, quizzed: NOW.getTime() - 3_600_000 }]));
    const batch = simulate({ state: { seen } });
    expect(batch).toHaveLength(FEED_BATCH_SIZE);
    expect(batch.some((i) => PACK_TYPES.has(i.type))).toBe(false);
    expect(batch.some((i) => i.type === "endOfMaterial")).toBe(false);
  });
});

describe("nivel și tipuri", () => {
  test("la A1, nicio regulă sau replică din conținut A2", () => {
    const sources: FeedSources = {
      ...SOURCES,
      grammar: [topic("a1", "A1"), topic("a2", "A2")],
      dialogues: [dialogue("d-a1", "A1"), dialogue("d-a2", "A2")],
      stories: [story("st-a2", "A2")],
    };
    const batch = simulate({ sources, batches: 6, state: { level: "A1" } });
    for (const item of batch) {
      if (item.type === "rule") expect(item.grammarId).toBe("a1");
      if (item.type === "gap") expect(item.grammarId).toBe("a1");
      if (item.type === "lines") expect(item.sourceId).toBe("d-a1");
    }
    expect(batch.some((i) => i.type === "rule")).toBe(true);
  });

  test("`types` restrânge lotul, iar lipsa testelor nu îl blochează", () => {
    const types = new Set(["knownWord", "sentence", "rule", "lines", "didYouKnow"] as const);
    const batch = simulate({ state: { types }, batches: 2, size: 12 });
    expect(batch.length).toBeGreaterThanOrEqual(12);
    for (const item of batch) {
      if (item.type === "endOfMaterial") continue;
      expect(types.has(item.type as never), item.type).toBe(true);
    }
  });

  test("material epuizat: lotul se încheie cu endOfMaterial", () => {
    const tiny: FeedSources = { words: [], details: new Map(), sentences: [], grammar: [topic("g1", "A1")], dialogues: [], stories: [], pack: [] };
    const shownKeys = new Set(Array.from({ length: 4 }, (_, i) => `rule:g1:${i}`));
    const batch = buildFeedBatch(
      tiny,
      { now: NOW, level: "A1", queue: [], cards: [], seen: {}, visit: visit0(), recent: [], shownKeys, types: new Set(["rule"]) },
      seededRandom(1),
    );
    expect(batch[batch.length - 1]!.type).toBe("endOfMaterial");
  });
});
