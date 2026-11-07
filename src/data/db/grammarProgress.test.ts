import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import { pendingCount } from "../sync/pending.ts";
import { createDb, type ImparaDb } from "./db.ts";
import { markLessonRead, saveGameScore } from "./grammarProgress.ts";

const T0 = new Date(2026, 10, 7, 10, 0, 0).getTime();
const at = (minutes: number) => new Date(T0 + minutes * 60_000);
let db: ImparaDb;

beforeEach(() => {
  db = createDb(`gp-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

test("markLessonRead păstrează prima dată", async () => {
  await markLessonRead(db, "articoli", at(0));
  await markLessonRead(db, "articoli", at(5));
  const row = await db.grammarProgress.get("articoli");
  expect(row?.readAt).toBe(at(0).getTime());
  expect(row?.best).toEqual({});
  expect(row?.dirty).toBe(1);
});

test("saveGameScore păstrează doar maximul; un scor mai mic nu scrie nimic", async () => {
  await saveGameScore(db, "articoli", "type", 80, at(0));
  await db.grammarProgress.update("articoli", { dirty: undefined });
  await saveGameScore(db, "articoli", "type", 50, at(1));
  const row = await db.grammarProgress.get("articoli");
  expect(row?.best).toEqual({ type: 80 });
  expect(row?.dirty).toBeUndefined();
  expect(row?.updatedAt).toBe(at(0).getTime());
});

test("saveGameScore: scor mai mare la alt joc se adaugă, citirea rămâne", async () => {
  await markLessonRead(db, "essere", at(0));
  await saveGameScore(db, "essere", "match", 60, at(1));
  await saveGameScore(db, "essere", "match", 90, at(2));
  expect(await db.grammarProgress.get("essere")).toMatchObject({
    readAt: at(0).getTime(),
    best: { match: 90 },
    updatedAt: at(2).getTime(),
  });
});

test("pendingCount numără progresul la gramatică netrimis", async () => {
  await saveGameScore(db, "avere", "match", 100, at(0));
  expect(await pendingCount(db)).toBe(1);
});
