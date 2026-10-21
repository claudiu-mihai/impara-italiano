import "fake-indexeddb/auto";
import { Rating } from "ts-fsrs";
import { afterEach, beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../../domain/settings.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { vocabCardId } from "../../domain/srs/types.ts";
import { createContentStore } from "../content/contentStore.ts";
import { loadStudyOverview } from "../queries.ts";
import { createDb, type ImparaDb } from "./db.ts";
import {
  countReviewsOn,
  forgetWord,
  getSettings,
  KNOWN_MARKER,
  markWordKnown,
  saveReview,
  saveSettings,
} from "./repositories.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0);
let db: ImparaDb;

beforeEach(() => {
  db = createDb(`test-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

const init = { cardId: vocabCardId("w1", "it-ro"), wordId: "w1", kind: "vocab", variant: "it-ro" } as const;

test("saveReview scrie cardul și jurnalul împreună", async () => {
  const card = newStoredCard(init, NOW, "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, Rating.Good, NOW, 0.9);
  await saveReview(db, next, log, { source: "flashcard", now: NOW, durationMs: 1200 });

  const stored = await db.cards.get(init.cardId);
  expect(stored?.reps).toBe(1);
  expect(stored?.due).toBeInstanceOf(Date);
  expect(await db.reviewLog.count()).toBe(1);
  expect(await countReviewsOn(db, "2026-10-20")).toBe(1);
  expect(await countReviewsOn(db, "2026-10-19")).toBe(0);
});

test("progresul persistă după redeschiderea bazei de date", async () => {
  const card = newStoredCard(init, NOW, "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, Rating.Easy, NOW, 0.9);
  await saveReview(db, next, log, { source: "flashcard", now: NOW });

  const name = db.name;
  db.close();
  db = createDb(name);
  expect((await db.cards.get(init.cardId))?.reps).toBe(1);
});

test("setările lipsă primesc valorile implicite, iar cele salvate se păstrează", async () => {
  expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  await saveSettings(db, { ...DEFAULT_SETTINGS, newPerDay: 5 });
  expect((await getSettings(db)).newPerDay).toBe(5);
  expect((await getSettings(db)).retention).toBe(DEFAULT_SETTINGS.retention);
});

test("sesiunea zilnică se construiește din baza de date", async () => {
  const words = [1, 2, 3].map((rank) => ({ id: `w${rank}`, rank }));
  const content = createContentStore(
    words.map((w) => ({ ...w, it: w.id, ro: w.id, pos: "adverb", tags: [], examples: [] })) as never,
    {} as never,
  );

  const first = await loadStudyOverview(db, content, NOW);
  expect(first.newCount).toBe(3);
  expect(first.dueCount).toBe(0);

  // w1 învățat azi cu „Ușor”: nu mai e nou și nu e scadent azi.
  const card = newStoredCard(init, NOW, "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, Rating.Easy, NOW, 0.9);
  await saveReview(db, next, log, { source: "flashcard", now: NOW });

  const second = await loadStudyOverview(db, content, NOW);
  expect(second.queue.map((i) => i.wordId)).toEqual(["w2", "w3"]);
});

test("„Știu deja” creează cardurile în ambele direcții, fără jurnal și fără a număra ca nou azi", async () => {
  await markWordKnown(db, "w9", NOW, 0.9);

  const cards = await db.cards.where("wordId").equals("w9").toArray();
  expect(cards.map((c) => c.variant).sort()).toEqual(["it-ro", "ro-it"]);
  expect(cards.every((c) => c.introducedOn === KNOWN_MARKER && c.reps === 1)).toBe(true);
  expect(cards.every((c) => c.due.getTime() > NOW.getTime() + 24 * 3600 * 1000)).toBe(true);
  expect(await db.reviewLog.count()).toBe(0);

  // un card existent nu este suprascris
  const before = await db.cards.get("vocab:w9:it-ro");
  await markWordKnown(db, "w9", new Date(NOW.getTime() + 3600_000), 0.9);
  expect(await db.cards.get("vocab:w9:it-ro")).toEqual(before);
});

test("cuvintele marcate „Știu deja” nu mai apar ca noi, dar nici nu consumă limita zilnică", async () => {
  const words = [1, 2, 3].map((rank) => ({ id: `w${rank}`, rank }));
  const content = createContentStore(
    words.map((w) => ({ ...w, it: w.id, ro: w.id, pos: "adverb", tags: [], examples: [] })) as never,
    {} as never,
  );
  await saveSettings(db, { ...DEFAULT_SETTINGS, newPerDay: 2 });
  await markWordKnown(db, "w1", NOW, 0.9);

  const overview = await loadStudyOverview(db, content, NOW);
  expect(overview.queue.filter((i) => i.isNew).map((i) => i.wordId)).toEqual(["w2", "w3"]);
});

test("ștergerea progresului unui cuvânt elimină toate cardurile lui", async () => {
  await markWordKnown(db, "w9", NOW, 0.9);
  await markWordKnown(db, "w8", NOW, 0.9);
  await forgetWord(db, "w9");
  expect((await db.cards.toArray()).map((c) => c.wordId)).toEqual(["w8", "w8"]);
});
