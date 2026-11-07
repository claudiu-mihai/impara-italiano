import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type ImparaDb } from "../db/db.ts";
import { markLessonRead, saveGameScore } from "../db/repositories.ts";
import { wipeLocalData } from "./account.ts";

let db: ImparaDb;
beforeEach(() => {
  db = createDb(`account-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

test("wipeLocalData șterge și progresul la gramatică (deconectare, „doar contul”, ștergerea contului)", async () => {
  const now = new Date(2026, 10, 7);
  await markLessonRead(db, "articoli", now);
  await saveGameScore(db, "essere", "type", 90, now);
  await wipeLocalData(db);
  expect(await db.grammarProgress.count()).toBe(0);
});
