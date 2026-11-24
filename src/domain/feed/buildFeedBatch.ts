import type { GeneratedDialogue, GeneratedPackItem, GeneratedStory, GrammarTopic, Level, Word } from "../content/schema.ts";
import type { CoreWord } from "../content/types.ts";
import { answerText } from "../content/display.ts";
import { isUpTo } from "../content/levels.ts";
import { normalize } from "../grading/normalize.ts";
import { LISTEN_SHARE } from "../quiz/buildQuizRound.ts";
import { pickDistractors } from "../quiz/distractors.ts";
import { shuffle, type Random } from "../random.ts";
import type { SentenceItem } from "../sentence/sentenceRound.ts";
import { isDue, type SessionItem } from "../session/buildDailySession.ts";
import type { Direction, StoredCard } from "../srs/types.ts";
import { endOfStudyDay } from "../time/studyDay.ts";
import { eligiblePackItems, eligiblePackQuizzes, type FeedSeen, type PackVisit } from "./pack.ts";
import { PACK_TYPES, TEST_TYPES, wordsOf, type FeedItem, type FeedItemType } from "./types.ts";

export const FEED_BATCH_SIZE = 15;

/** Același cuvânt nu apare de două ori în atâtea carduri. */
const WORD_WINDOW = 10;
/** Nu apar mai mult de atâtea carduri la rând fără test. */
const MAX_WITHOUT_TEST = 3;
/** Același tip de card de cel mult atâtea ori la rând (repetițiile, ceva mai des: sunt miezul fluxului). */
const MAX_RUN = 2;
const MAX_REVIEW_RUN = 3;
/** Un card din pachet apare cel târziu după atâtea carduri fără pachet, începând cu al cincilea card al vizitei. */
const PACK_AFTER_CARDS = 7;
const PACK_FROM_POSITION = 5;

// Ponderi de pornire, de ajustat după folosire. Cât timp există repetiții: repetiții 40, teste 25, restul 35;
// după ele: teste 30, restul 70 (împărțit după `FREE_WEIGHTS`).
export const REVIEW_WEIGHT = 40;
export const TEST_WEIGHT_WITH_REVIEWS = 25;
export const REST_WEIGHT_WITH_REVIEWS = 35;
export const TEST_WEIGHT_FREE = 30;
export const REST_WEIGHT_FREE = 70;
export const FREE_WEIGHTS: Partial<Record<FeedItemType, number>> = {
  sentence: 15,
  knownWord: 10,
  lines: 10,
  rule: 10,
  didYouKnow: 5,
  newWord: 5,
  pack: 15,
};
export const TEST_WEIGHTS: Partial<Record<FeedItemType, number>> = { grid: 40, trueFalse: 25, gap: 20, packQuiz: 15 };

export interface FeedSources {
  words: readonly CoreWord[];
  details: ReadonlyMap<string, Word>;
  sentences: readonly SentenceItem[];
  grammar: readonly GrammarTopic[];
  dialogues: readonly GeneratedDialogue[];
  stories: readonly GeneratedStory[];
  pack: readonly GeneratedPackItem[];
}

export interface FeedState {
  now: Date;
  level: Level;
  /** Coada sesiunii zilnice, recalculată înaintea fiecărui lot (repetiții + carduri noi, cu limitele zilei). */
  queue: readonly SessionItem[];
  /** Cardurile de vocabular (pentru cuvintele începute și scadență). */
  cards: readonly StoredCard[];
  seen: FeedSeen;
  visit: PackVisit;
  /** Ultimele carduri afișate (cel puțin 10), pentru regulile de ordine peste granița loturilor. */
  recent: readonly FeedItem[];
  /** Cheile cardurilor arătate deja în vizită (nu se repetă). */
  shownKeys: ReadonlySet<string>;
  /** Tipurile pe care ecranul știe să le afișeze; lipsă = toate. */
  types?: ReadonlySet<FeedItemType>;
}

const SELECTABLE = [
  "review",
  "newWord",
  "knownWord",
  "sentence",
  "rule",
  "lines",
  "didYouKnow",
  "grid",
  "trueFalse",
  "gap",
  "pack",
  "packQuiz",
] as const satisfies readonly FeedItemType[];
type SelectableType = (typeof SELECTABLE)[number];

const pickOne = <T>(items: readonly T[], random: Random): T | undefined => items[Math.floor(random() * items.length)];

function weightedPick<T>(entries: readonly (readonly [T, number])[], random: Random): T | undefined {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return undefined;
  let roll = random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1]![0];
}

/** Câte carduri de la sfârșitul secvenței nu satisfac `match` (până la primul care o satisface). */
function since(seq: readonly FeedItem[], match: (item: FeedItem) => boolean): number {
  let n = 0;
  for (let i = seq.length - 1; i >= 0 && !match(seq[i]!); i--) n++;
  return n;
}

const flatLines = (story: GeneratedStory) => story.scenes.reduce((n, scene) => n + scene.lines.length, 0);

/**
 * Următoarele carduri ale fluxului. Repetițiile și cuvintele noi vin din coada sesiunii zilnice; restul din conținutul
 * existent și din pachetul nou. Regulile de ordine (fără două teste la rând, cel mult 3 carduri fără test, același tip
 * de cel mult 2 ori la rând, același cuvânt o dată la 10 carduri) țin și peste granița dintre loturi, prin `state.recent`.
 * Când nu mai există niciun candidat, lotul se încheie cu un card `endOfMaterial`.
 */
export function buildFeedBatch(sources: FeedSources, state: FeedState, random: Random = Math.random, size: number = FEED_BATCH_SIZE): FeedItem[] {
  const { now, level } = state;
  const okLevel = (l: Level) => isUpTo(l, level);
  const allowedType = (type: FeedItemType) => !state.types || state.types.has(type);
  const packById = new Map(sources.pack.map((p) => [p.id, p]));
  const endOfDay = endOfStudyDay(now);

  // cuvintele începute (cu card de vocabular) și cardurile lor nescadente, la nivelul ales
  const cardsByWord = new Map<string, StoredCard[]>();
  for (const card of state.cards) {
    if (card.kind === "vocab") cardsByWord.set(card.wordId, [...(cardsByWord.get(card.wordId) ?? []), card]);
  }
  const resting: { word: CoreWord; cards: StoredCard[] }[] = [];
  for (const word of sources.words) {
    const cards = cardsByWord.get(word.id)?.filter((c) => !isDue(c, now, endOfDay));
    if (cards?.length && okLevel(word.level)) resting.push({ word, cards });
  }
  const eligibleSentences = sources.sentences.filter((s) => s.wordIds.every((id) => cardsByWord.has(id)));
  const ruleList = sources.grammar.filter((t) => okLevel(t.level)).flatMap((t) => t.rules.map((_, i) => ({ grammarId: t.id, index: i })));
  const gapTopics = sources.grammar.filter((t) => okLevel(t.level) && t.items.length >= 3);
  const lineSources = [
    ...sources.dialogues.filter((d) => okLevel(d.level)).map((d) => ({ source: "dialogue" as const, id: d.id, total: d.lines.length })),
    ...sources.stories.filter((s) => okLevel(s.level)).map((s) => ({ source: "story" as const, id: s.id, total: flatLines(s) })),
  ].filter((s) => s.total >= 2);
  const knowledgeWords = sources.words.filter((w) => {
    const detail = sources.details.get(w.id);
    return okLevel(w.level) && !!(detail?.note || detail?.falseFriend);
  });

  const batch: FeedItem[] = [];
  const shownAt = new Map(state.visit.shownAt);
  const quizzed = new Set(state.visit.quizzed);
  const usedKeys = new Set(state.shownKeys);
  const usedCards = new Set<string>();

  const isTest = (item: FeedItem | undefined) => item !== undefined && TEST_TYPES.has(item.type);

  /** Un card ales, sau `undefined` când nu există niciun candidat; `relaxed` renunță la regula cuvintelor. */
  function pick(relaxed: boolean): FeedItem | undefined {
    const seq = [...state.recent, ...batch];
    const pos = state.visit.count + batch.length;
    const last = seq[seq.length - 1];
    const blocked = new Set<string>(relaxed ? [] : seq.slice(-WORD_WINDOW).flatMap((i) => wordsOf(i, packById)));
    const free = (key: string) => !usedKeys.has(key);
    const visit: PackVisit = { visitStart: state.visit.visitStart, shownAt, quizzed, count: pos };

    const restingNow = resting.filter((r) => !blocked.has(r.word.id));
    const askOf = (r: { word: CoreWord; cards: StoredCard[] }) => {
      const card = pickOne(r.cards, random)!;
      return { word: r.word, card, direction: card.variant as Direction };
    };
    const distractorsOf = (word: CoreWord, direction: Direction, count: number) =>
      pickDistractors({ target: word, pool: sources.words, direction, count, random }).map((w) => answerText(w, direction));

    const generators: Record<SelectableType, () => FeedItem | undefined> = {
      review: () => {
        const q = state.queue.find((i) => !i.isNew && !usedCards.has(i.cardId) && !blocked.has(i.wordId));
        return q && { type: "review", key: `review:${q.cardId}:${pos}`, item: q };
      },
      newWord: () => {
        const q = state.queue.find((i) => i.isNew && !usedCards.has(i.cardId) && !blocked.has(i.wordId));
        return q && { type: "newWord", key: `new:${q.cardId}:${pos}`, item: q };
      },
      knownWord: () => {
        const r = pickOne(restingNow.filter((x) => free(`word:${x.word.id}`)), random);
        return r && { type: "knownWord", key: `word:${r.word.id}`, wordId: r.word.id };
      },
      sentence: () => {
        const s = pickOne(eligibleSentences.filter((x) => free(`sentence:${x.id}`)), random);
        return s && { type: "sentence", key: `sentence:${s.id}`, sentenceId: s.id };
      },
      rule: () => {
        const r = pickOne(ruleList.filter((x) => free(`rule:${x.grammarId}:${x.index}`)), random);
        return r && { type: "rule", key: `rule:${r.grammarId}:${r.index}`, grammarId: r.grammarId, ruleIndex: r.index };
      },
      lines: () => {
        for (let attempt = 0; attempt < 4; attempt++) {
          const src = pickOne(lineSources, random);
          if (!src) return undefined;
          const count = Math.min(src.total, 2 + Math.floor(random() * 2));
          const start = Math.floor(random() * (src.total - count + 1));
          const key = `lines:${src.source}:${src.id}:${start}`;
          if (free(key)) return { type: "lines", key, source: src.source, sourceId: src.id, start, count };
        }
        return undefined;
      },
      didYouKnow: () => {
        const w = pickOne(knowledgeWords.filter((x) => !blocked.has(x.id) && free(`dyk:${x.id}`)), random);
        if (!w) return undefined;
        const detail = sources.details.get(w.id)!;
        const fields = (["falseFriend", "note"] as const).filter((f) => detail[f]);
        return { type: "didYouKnow", key: `dyk:${w.id}`, wordId: w.id, field: pickOne(fields, random)! };
      },
      grid: () => {
        const r = pickOne(restingNow, random);
        if (!r) return undefined;
        const { word, card, direction } = askOf(r);
        const wrong = distractorsOf(word, direction, 3);
        if (wrong.length < 3) return undefined;
        const correct = answerText(word, direction);
        const options = shuffle([correct, ...wrong], random);
        return {
          type: "grid",
          key: `grid:${word.id}:${pos}`,
          question: {
            wordId: word.id,
            cardId: card.cardId,
            direction,
            options,
            correctIndex: options.indexOf(correct),
            listen: direction === "it-ro" && random() < LISTEN_SHARE,
            followUp: false,
          },
        };
      },
      trueFalse: () => {
        const r = pickOne(restingNow, random);
        if (!r) return undefined;
        const { word, direction } = askOf(r);
        const wrong = random() < 0.5 ? undefined : distractorsOf(word, direction, 1)[0];
        return {
          type: "trueFalse",
          key: `tf:${word.id}:${pos}`,
          wordId: word.id,
          direction,
          shown: wrong ?? answerText(word, direction),
          isTrue: wrong === undefined,
        };
      },
      gap: () => {
        const topic = pickOne(gapTopics, random);
        const item = topic && pickOne(topic.items, random);
        if (!topic || !item) return undefined;
        const others = shuffle(
          topic.items.filter((x) => normalize(x.gap) !== normalize(item.gap)),
          random,
        ).map((x) => x.gap);
        const wrong = [...new Map(others.map((g) => [normalize(g), g])).values()].slice(0, 2);
        if (wrong.length < 2) return undefined;
        const options = shuffle([item.gap, ...wrong], random);
        return { type: "gap", key: `gap:${topic.id}:${item.id}:${pos}`, grammarId: topic.id, itemId: item.id, options, correctIndex: options.indexOf(item.gap) };
      },
      pack: () => {
        const item = eligiblePackItems(sources.pack, state.seen, visit, level, now.getTime()).find(
          (p) => free(`pack:${p.id}`) && !p.wordIds.some((w) => blocked.has(w)),
        );
        return item && { type: "pack", key: `pack:${item.id}`, packId: item.id };
      },
      packQuiz: () => {
        const item = eligiblePackQuizzes(sources.pack, state.seen, visit, level, now.getTime()).find(
          (p) => free(`packQuiz:${p.id}`) && !p.wordIds.some((w) => blocked.has(w)),
        );
        return item && { type: "packQuiz", key: `packQuiz:${item.id}`, packId: item.id };
      },
    };

    const cache = new Map<FeedItemType, FeedItem | undefined>();
    const candidate = (type: FeedItemType): FeedItem | undefined => {
      if (!cache.has(type)) {
        const run = since(seq, (i) => i.type !== type);
        const limit = type === "review" ? MAX_REVIEW_RUN : MAX_RUN;
        const afterTest = TEST_TYPES.has(type) && isTest(last);
        const ok = type in generators && allowedType(type) && run < limit && !afterTest;
        cache.set(type, ok ? generators[type as SelectableType]() : undefined);
      }
      return cache.get(type);
    };
    const choose = (types: readonly FeedItemType[], weightOf: (t: FeedItemType) => number = () => 1) =>
      weightedPick(
        types.flatMap((t) => (candidate(t) ? [[t, weightOf(t)] as const] : [])),
        random,
      );

    // primul card al vizitei: ceva ușor și plăcut, nu un test
    if (pos === 0) {
      const first = choose(["knownWord", "pack", "didYouKnow"]);
      if (first) return candidate(first);
    }
    // nu mai mult de câteva carduri fără test
    const testTypes = [...TEST_TYPES];
    if (pos > 0 && since(seq, isTest) >= MAX_WITHOUT_TEST) {
      const t = choose(testTypes, (type) => TEST_WEIGHTS[type] ?? 1);
      if (t) return candidate(t);
    }
    // un card din pachet cam o dată la 6–8 carduri, doar dacă există unul eligibil
    if (pos >= PACK_FROM_POSITION && since(seq, (i) => PACK_TYPES.has(i.type)) >= PACK_AFTER_CARDS) {
      const t = choose(["pack", "packQuiz"]);
      if (t) return candidate(t);
    }

    // alegere ponderată între ce se poate
    const hasReviews = candidate("review") !== undefined;
    const entries: (readonly [FeedItemType, number])[] = [];
    if (hasReviews) entries.push(["review", REVIEW_WEIGHT]);
    const tests = testTypes.filter((t) => pos > 0 && candidate(t));
    if (tests.length) {
      const share = hasReviews ? TEST_WEIGHT_WITH_REVIEWS : TEST_WEIGHT_FREE;
      const sum = tests.reduce((s, t) => s + (TEST_WEIGHTS[t] ?? 1), 0);
      for (const t of tests) entries.push([t, (share * (TEST_WEIGHTS[t] ?? 1)) / sum]);
    }
    const freeTypes = (Object.keys(FREE_WEIGHTS) as FeedItemType[]).filter((t) => candidate(t));
    const freeSum = freeTypes.reduce((s, t) => s + FREE_WEIGHTS[t]!, 0);
    const restShare = hasReviews ? REST_WEIGHT_WITH_REVIEWS : REST_WEIGHT_FREE;
    for (const t of freeTypes) entries.push([t, (restShare * FREE_WEIGHTS[t]!) / freeSum]);
    const chosen = weightedPick(entries, random);
    return chosen && candidate(chosen);
  }

  while (batch.length < size) {
    const item = pick(false) ?? pick(true);
    if (!item) {
      batch.push({ type: "endOfMaterial", key: `end:${state.visit.count + batch.length}` });
      break;
    }
    const pos = state.visit.count + batch.length;
    batch.push(item);
    usedKeys.add(item.key);
    if (item.type === "review" || item.type === "newWord") usedCards.add(item.item.cardId);
    if (item.type === "pack") shownAt.set(item.packId, pos);
    if (item.type === "packQuiz") quizzed.add(item.packId);
  }
  return batch;
}
