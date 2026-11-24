import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type ImparaDb } from "../db/db.ts";
import { loadFeedSeen, markFeedSeen } from "./feedSeen.ts";

const NOW = new Date(2026, 10, 24, 12, 0, 0);
let db: ImparaDb;

beforeEach(() => {
  db = createDb(`test-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

test("fără nimic salvat: obiect gol", async () => {
  expect(await loadFeedSeen(db)).toEqual({});
});

test("markFeedSeen păstrează câmpurile fiecărui item și nu atinge celelalte iteme", async () => {
  await markFeedSeen(db, "espr-a", "shown", NOW);
  await markFeedSeen(db, "espr-a", "quizzed", new Date(NOW.getTime() + 1000));
  await markFeedSeen(db, "espr-b", "shown", NOW);
  expect(await loadFeedSeen(db)).toEqual({
    "espr-a": { shown: NOW.getTime(), quizzed: NOW.getTime() + 1000 },
    "espr-b": { shown: NOW.getTime() },
  });
});

test("marcările simultane nu se pierd", async () => {
  await Promise.all(["a", "b", "c", "d"].map((id) => markFeedSeen(db, id, "shown", NOW)));
  expect(Object.keys(await loadFeedSeen(db)).sort()).toEqual(["a", "b", "c", "d"]);
});
