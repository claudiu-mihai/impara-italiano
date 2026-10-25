import "fake-indexeddb/auto";
import { Rating } from "ts-fsrs";
import { afterEach, beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../../domain/settings.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { vocabCardId } from "../../domain/srs/types.ts";
import { createDb, type ImparaDb } from "../db/db.ts";
import { saveReview, saveSettings } from "../db/repositories.ts";
import { BackupError, backupToJson, exportBackup, importBackup, parseBackup, resetProgress } from "./backup.ts";

const NOW = new Date(2026, 9, 20, 10, 0, 0);
let db: ImparaDb;

/** Rândul fără metadatele de sincronizare. */
const content = <T extends object>(row: T) => {
  const { updatedAt: _u, uid: _uid, dirty: _d, ...rest } = row as T & { updatedAt?: number; uid?: string; dirty?: 1 };
  return rest;
};

beforeEach(() => {
  db = createDb(`backup-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

async function learn(wordId: string, grade: Rating.Good | Rating.Again = Rating.Good) {
  const card = newStoredCard({ cardId: vocabCardId(wordId, "it-ro"), wordId, kind: "vocab", variant: "it-ro" }, NOW, "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, grade, NOW, 0.9);
  await saveReview(db, next, log, { source: "flashcard", now: NOW, durationMs: 800 });
}

test("export → JSON → import reface exact progresul într-o bază goală", async () => {
  await learn("v-parlare");
  await learn("v-dire", Rating.Again);
  await saveSettings(db, { ...DEFAULT_SETTINGS, newPerDay: 4, direction: "ro-it" });
  await db.reports.add({ wordId: "v-dire", createdAt: NOW, message: "traducere" });

  const json = backupToJson(await exportBackup(db, "abc123", NOW));

  const other = createDb(`restore-${Math.random()}`);
  try {
    await importBackup(other, parseBackup(json));
    // metadatele de sincronizare (updatedAt, uid, dirty) se regenerează la import; conținutul rămâne identic
    expect((await other.cards.toArray()).map(content)).toEqual((await db.cards.toArray()).map(content));
    expect((await other.reviewLog.toArray()).map(content)).toEqual((await db.reviewLog.toArray()).map(content));
    expect((await other.reports.toArray()).map(content)).toEqual((await db.reports.toArray()).map(content));
    expect((await other.settings.get("app"))?.newPerDay).toBe(4);
    expect((await other.cards.toArray())[0]?.due).toBeInstanceOf(Date);
  } finally {
    await other.delete();
  }
});

test("importul înlocuiește progresul existent", async () => {
  await learn("v-parlare");
  const json = backupToJson(await exportBackup(db, "abc123", NOW));
  await learn("v-dire");
  expect(await db.cards.count()).toBe(2);

  await importBackup(db, parseBackup(json));
  expect((await db.cards.toArray()).map((c) => c.wordId)).toEqual(["v-parlare"]);
  expect(await db.reviewLog.count()).toBe(1);
});

test("exportul reține momentul ultimului backup", async () => {
  await exportBackup(db, "abc123", NOW);
  expect((await db.meta.get("lastExportAt"))?.value).toBe(NOW.toISOString());
});

test("fișiere invalide primesc mesaje clare", () => {
  expect(() => parseBackup("nu e json")).toThrow(BackupError);
  expect(() => parseBackup('{"format":"altceva"}')).toThrow(/nu este un backup/);
  expect(() => parseBackup('{"format":"impara-backup","version":1}')).toThrow(BackupError);
});

test("setările lipsă din backup primesc valorile implicite", async () => {
  const backup = JSON.parse(backupToJson(await exportBackup(db, "x", NOW)));
  backup.settings = { newPerDay: 7 };
  const parsed = parseBackup(JSON.stringify(backup));
  expect(parsed.settings).toEqual({ ...DEFAULT_SETTINGS, newPerDay: 7 });
});

test("un backup vechi, fără „Traducere în limba maternă”, primește valoarea după nivelul din backup", async () => {
  const backup = JSON.parse(backupToJson(await exportBackup(db, "x", NOW)));
  backup.settings = { level: "B1" };
  expect(parseBackup(JSON.stringify(backup)).settings.nativeHelp).toBe(false);
  backup.settings = { level: "A2" };
  expect(parseBackup(JSON.stringify(backup)).settings.nativeHelp).toBe(true);
  backup.settings = { level: "B1", nativeHelp: true };
  expect(parseBackup(JSON.stringify(backup)).settings.nativeHelp).toBe(true);
});

test("limba interfeței: backup-urile vechi primesc româna, cele noi o păstrează", async () => {
  const backup = JSON.parse(backupToJson(await exportBackup(db, "x", NOW)));
  backup.settings = { level: "B1" };
  expect(parseBackup(JSON.stringify(backup)).settings.uiLanguage).toBe("ro");
  backup.settings = { uiLanguage: "it" };
  expect(parseBackup(JSON.stringify(backup)).settings.uiLanguage).toBe("it");
  backup.settings = { uiLanguage: "fr" };
  expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError);
});

test("resetarea șterge progresul, dar păstrează setările", async () => {
  await learn("v-parlare");
  await saveSettings(db, { ...DEFAULT_SETTINGS, newPerDay: 4 });
  await resetProgress(db);
  expect(await db.cards.count()).toBe(0);
  expect(await db.reviewLog.count()).toBe(0);
  expect((await db.settings.get("app"))?.newPerDay).toBe(4);
});
