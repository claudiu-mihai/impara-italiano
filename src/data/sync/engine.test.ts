import "fake-indexeddb/auto";
import Dexie from "dexie";
import { Rating } from "ts-fsrs";
import { afterEach, beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../../domain/settings.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { vocabCardId } from "../../domain/srs/types.ts";
import { exportBackup, importBackup, parseBackup, backupToJson, resetProgress } from "../backup/backup.ts";
import { createDb, type ImparaDb } from "../db/db.ts";
import { forgetWord, getSettings, markWordKnown, saveReview, saveSettings } from "../db/repositories.ts";
import { PUSH_CHUNK, runSync } from "./engine.ts";
import { hasLocalProgress, pendingCount } from "./pending.ts";
import { FakeRemote } from "./fakeRemote.ts";

const T0 = new Date(2026, 9, 20, 10, 0, 0).getTime();
const at = (minutes: number) => new Date(T0 + minutes * 60_000);

let remote: FakeRemote;
const dbs: ImparaDb[] = [];

/** Un „telefon”: bază locală proprie, autentificată în același cont. */
async function device(signedIn = true): Promise<ImparaDb> {
  const db = createDb(`sync-${Math.random()}`);
  dbs.push(db);
  if (signedIn) await db.meta.put({ key: "syncUserId", value: "u1" });
  return db;
}

beforeEach(() => {
  remote = new FakeRemote();
});
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

async function review(db: ImparaDb, wordId: string, minutes: number, grade: Rating.Good | Rating.Again | Rating.Easy = Rating.Good) {
  const cardId = vocabCardId(wordId, "it-ro");
  const now = at(minutes);
  const card = (await db.cards.get(cardId)) ?? newStoredCard({ cardId, wordId, kind: "vocab", variant: "it-ro" }, now, "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, grade, now, 0.9);
  await saveReview(db, next, log, { source: "flashcard", now });
}

const cardIds = async (db: ImparaDb) => (await db.cards.toArray()).map((c) => c.cardId).sort();
const logUids = async (db: ImparaDb) => (await db.reviewLog.toArray()).map((l) => l.uid).sort();
const sync = (db: ImparaDb) => runSync(db, remote);

test("repetițiile de pe un dispozitiv ajung pe celălalt: aceleași carduri și același jurnal", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await review(a, "w1", 5);
  await review(a, "w2", 6, Rating.Again);

  const sent = await sync(a);
  expect(sent.pushed).toBe(2 /* carduri */ + 3 /* repetiții */);
  await sync(b);

  expect(await cardIds(b)).toEqual(await cardIds(a));
  expect(await logUids(b)).toEqual(await logUids(a));
  // starea FSRS ajunge întreagă, cu date (nu șiruri)
  const fromA = await a.cards.get(vocabCardId("w1", "it-ro"));
  const fromB = await b.cards.get(vocabCardId("w1", "it-ro"));
  expect(fromB?.due).toBeInstanceOf(Date);
  expect(fromB?.due).toEqual(fromA?.due);
  expect(fromB?.reps).toBe(2);
  expect(fromB?.dirty).toBeUndefined();
  // ce a venit de pe server nu se retrimite
  expect(await pendingCount(b)).toBe(0);
});

test("după o trimitere reușită nu mai rămâne nimic în așteptare, iar următoarea rulare nu trimite nimic", async () => {
  const a = await device();
  await review(a, "w1", 0);
  await saveSettings(a, { ...DEFAULT_SETTINGS, newPerDay: 3 });
  expect(await pendingCount(a)).toBe(3); // card + repetiție + setări

  await sync(a);
  expect(await pendingCount(a)).toBe(0);
  const pushes = remote.pushes;
  const again = await sync(a);
  expect(again.pushed).toBe(0);
  expect(remote.pushes).toBe(pushes);
});

test("două dispozitive cu repetiții offline pe carduri diferite converg la același progres", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await review(b, "w2", 1);
  await review(b, "w3", 2);

  await sync(a);
  await sync(b);
  await sync(a);

  expect(await cardIds(a)).toEqual(["vocab:w1:it-ro", "vocab:w2:it-ro", "vocab:w3:it-ro"]);
  expect(await cardIds(b)).toEqual(await cardIds(a));
  expect(await logUids(a)).toEqual(await logUids(b));
  expect(await a.reviewLog.count()).toBe(3);
});

test("același card repetat pe ambele dispozitive: câștigă repetiția mai nouă, pe ambele", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await sync(a);
  await sync(b);

  await review(a, "w1", 10); // reps 2, la minutul 10
  await review(b, "w1", 20); // reps 2, la minutul 20 (mai nou)
  await review(b, "w1", 25); // reps 3, la minutul 25 (cel mai nou)

  await sync(a);
  await sync(b);
  await sync(a);

  const id = vocabCardId("w1", "it-ro");
  expect((await a.cards.get(id))?.reps).toBe(3);
  expect((await b.cards.get(id))?.reps).toBe(3);
  expect((await a.cards.get(id))?.updatedAt).toBe(at(25).getTime());
  // jurnalul păstrează toate repetițiile de pe ambele dispozitive
  expect(await a.reviewLog.count()).toBe(4);
  expect(await logUids(a)).toEqual(await logUids(b));
});

test("un card mai vechi de pe un dispozitiv nu înlocuiește unul mai nou de pe server", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await review(b, "w1", 5); // b: reps 1, minutul 5
  await review(b, "w1", 30); // b: reps 2, minutul 30
  await sync(b);
  await sync(a); // a (minutul 0) vede cardul mai nou al lui b

  expect((await a.cards.get(vocabCardId("w1", "it-ro")))?.reps).toBe(2);
  // cardul vechi al lui a nu a ajuns pe server; doar repetiția lui din jurnal a plecat
  expect(remote.store.cards.get(vocabCardId("w1", "it-ro"))?.updatedAt).toBe(at(30).getTime());
  expect(remote.store.review_logs.size).toBe(3);
  expect(await pendingCount(a)).toBe(0);
  await sync(b);
  expect((await b.cards.get(vocabCardId("w1", "it-ro")))?.reps).toBe(2);
  expect(await b.reviewLog.count()).toBe(3);
});

test("serverul poate pierde o versiune mai nouă: dispozitivul care o are o retrimite", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 30);
  await sync(a);
  await sync(b);
  // simulăm o înlocuire cu o versiune veche (cursă între două dispozitive)
  const id = vocabCardId("w1", "it-ro");
  const stale = structuredClone(remote.store.cards.get(id)!);
  stale.updatedAt = at(1).getTime();
  await remote.push("cards", [stale]);

  expect(remote.store.cards.get(id)?.updatedAt).toBe(at(1).getTime());
  // a descarcă, vede că are mai nou decât serverul și retrimite în aceeași rulare
  await sync(a);
  expect(remote.store.cards.get(id)?.updatedAt).toBe(at(30).getTime());
  expect(await pendingCount(a)).toBe(0);
  // celălalt dispozitiv nu rămâne cu versiunea veche
  await sync(b);
  expect((await b.cards.get(id))?.updatedAt).toBe(at(30).getTime());
});

test("ștergerea progresului unui cuvânt ajunge pe celălalt dispozitiv", async () => {
  const a = await device();
  const b = await device();
  await markWordKnown(a, "w9", at(0), 0.9);
  await sync(a);
  await sync(b);
  expect(await b.cards.count()).toBe(2);

  await forgetWord(a, "w9", at(10));
  expect(await a.tombstones.count()).toBe(2);
  await sync(a);
  expect(await a.tombstones.count()).toBe(0);
  await sync(b);
  expect(await b.cards.count()).toBe(0);
});

test("un cuvânt reînvățat după ștergere nu e șters din nou de ștergerea veche", async () => {
  const a = await device();
  const b = await device();
  await markWordKnown(a, "w9", at(0), 0.9);
  await sync(a);
  await sync(b);
  await forgetWord(a, "w9", at(10));
  await sync(a);
  await sync(b); // b a șters cuvântul

  await review(b, "w9", 40); // b îl reînvață, mai nou decât ștergerea
  await sync(b);
  await sync(a);
  expect((await a.cards.toArray()).map((c) => c.cardId)).toEqual([vocabCardId("w9", "it-ro")]);
});

test("o ștergere offline nu e anulată de un card vechi de pe server", async () => {
  const a = await device();
  const b = await device();
  await markWordKnown(a, "w9", at(0), 0.9);
  await sync(a);
  await sync(b);

  await forgetWord(b, "w9", at(50)); // b șterge offline
  await sync(a); // nimic nou pentru a
  await sync(b); // b: descarcă (cardul vechi de pe server nu înlocuiește ștergerea), apoi trimite ștergerea
  expect(await b.cards.count()).toBe(0);
  await sync(a);
  expect(await a.cards.count()).toBe(0);
});

test("fără cont nu se creează marcaje de ștergere", async () => {
  const solo = await device(false);
  await markWordKnown(solo, "w9", at(0), 0.9);
  await forgetWord(solo, "w9", at(1));
  expect(await solo.tombstones.count()).toBe(0);
  expect(await solo.cards.count()).toBe(0);
});

test("o modificare făcută în timpul trimiterii nu se pierde", async () => {
  const a = await device();
  await review(a, "w1", 0);
  remote.beforePush = async (collection) => {
    if (collection === "cards") await review(a, "w1", 5); // repetiție nouă exact în timpul trimiterii
    remote.beforePush = undefined;
  };
  await sync(a);

  const card = await a.cards.get(vocabCardId("w1", "it-ro"));
  expect(card?.reps).toBe(2);
  expect(card?.dirty).toBe(1); // versiunea nouă nu a fost trimisă încă
  await sync(a);
  expect(remote.store.cards.get(vocabCardId("w1", "it-ro"))?.updatedAt).toBe(at(5).getTime());
  expect(await pendingCount(a)).toBe(0);
});

test("o eroare de rețea lasă modificările în așteptare, iar următoarea rulare le trimite", async () => {
  const a = await device();
  await review(a, "w1", 0);
  remote.failWith = new Error("rețea căzută");
  await expect(sync(a)).rejects.toThrow("rețea căzută");
  expect(await pendingCount(a)).toBe(2);

  remote.failWith = undefined;
  await sync(a);
  expect(await pendingCount(a)).toBe(0);
  expect(remote.store.cards.size).toBe(1);
});

test("trimiterea se face în loturi", async () => {
  const a = await device();
  for (let i = 0; i < PUSH_CHUNK + 10; i++) await markWordKnown(a, `w${i}`, at(i), 0.9);
  await sync(a);
  // (50 + 10) cuvinte × 2 direcții = 120 de carduri → 3 cereri pentru carduri
  expect(remote.store.cards.size).toBe((PUSH_CHUNK + 10) * 2);
  expect(remote.pushes).toBe(3);
});

test("setările: câștigă cele mai noi, iar vocea aleasă rămâne pe dispozitiv", async () => {
  const a = await device();
  const b = await device();
  await saveSettings(a, { ...DEFAULT_SETTINGS, newPerDay: 3, ttsVoiceURI: "mac:alice" });
  await sync(a);
  expect(JSON.stringify(remote.store.settings.get("app")?.data)).not.toContain("mac:alice");

  await saveSettings(b, { ...DEFAULT_SETTINGS, ttsVoiceURI: "win:ioana" });
  await b.settings.update("app", { updatedAt: 1 }); // setările lui b sunt mai vechi
  await sync(b);

  const settings = await getSettings(b);
  expect(settings.newPerDay).toBe(3);
  expect(settings.ttsVoiceURI).toBe("win:ioana");
});

test("jurnalul se adaugă fără dubluri chiar dacă aceleași intrări sunt descărcate de mai multe ori", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await review(a, "w1", 5);
  await sync(a);
  await sync(b);
  await sync(b);
  await sync(b);
  expect(await b.reviewLog.count()).toBe(2);
});

test("date invalide de pe server se ignoră, fără să oprească sincronizarea", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await review(a, "w2", 1);
  await sync(a);
  const bad = remote.store.cards.get(vocabCardId("w1", "it-ro"))!;
  bad.data = { ceva: "greșit" };

  const report = await sync(b);
  expect(report.invalid).toBe(1);
  expect(await cardIds(b)).toEqual([vocabCardId("w2", "it-ro")]);
});

test("progresul existent înaintea contului se urcă la prima sincronizare", async () => {
  const solo = await device(false); // folosit fără cont
  await review(solo, "w1", 0);
  await review(solo, "w2", 1);
  expect(await hasLocalProgress(solo)).toBe(true);

  await solo.meta.put({ key: "syncUserId", value: "u1" }); // se autentifică
  await sync(solo);
  expect(remote.store.cards.size).toBe(2);
  expect(remote.store.review_logs.size).toBe(2);
});

test("migrarea v1 → v2 marchează tot progresul existent ca netrimis și îi dă identificatori", async () => {
  const name = `migrate-${Math.random()}`;
  const old = new Dexie(name);
  old.version(1).stores({
    cards: "cardId, due, wordId, kind, state",
    reviewLog: "++id, cardId, studyDay",
    settings: "key",
    reports: "++id, wordId",
    meta: "key",
  });
  const card = newStoredCard({ cardId: "vocab:w1:it-ro", wordId: "w1", kind: "vocab", variant: "it-ro" }, at(0), "2026-10-20");
  const { card: next, log } = reviewStoredCard(card, Rating.Good, at(0), 0.9);
  await old.table("cards").put(next);
  await old.table("reviewLog").add({ cardId: next.cardId, rating: 3, reviewedAt: at(0), studyDay: "2026-10-20", source: "flashcard", fsrs: log });
  await old.table("reports").add({ wordId: "w1", createdAt: at(0) });
  await old.table("settings").put({ ...DEFAULT_SETTINGS, key: "app", newPerDay: 4 });
  old.close();

  const db = createDb(name);
  dbs.push(db);
  const migrated = await db.cards.get("vocab:w1:it-ro");
  expect(migrated?.dirty).toBe(1);
  expect(migrated?.updatedAt).toBe(at(0).getTime());
  const logRow = (await db.reviewLog.toArray())[0]!;
  expect(logRow.uid).toMatch(/^[0-9a-f-]{36}$/);
  expect(logRow.dirty).toBe(1);
  expect((await db.reports.toArray())[0]?.uid).toBeTruthy();
  expect((await getSettings(db)).newPerDay).toBe(4); // setările se citesc la fel ca înainte
  expect(await pendingCount(db)).toBe(4);
});

test("importul de backup cu cont înlocuiește complet progresul din cont", async () => {
  const a = await device();
  const b = await device();
  await review(a, "w1", 0);
  await review(a, "w2", 1);
  await sync(a);

  // backup făcut pe un alt dispozitiv, doar cu cuvântul w3
  const donor = await device(false);
  await review(donor, "w3", 2);
  const backup = parseBackup(backupToJson(await exportBackup(donor, "x", at(3))));

  await importBackup(a, backup, at(4));
  expect(await pendingCount(a)).toBeGreaterThan(0);
  await sync(a);

  expect([...remote.store.cards.keys()]).toEqual([vocabCardId("w3", "it-ro")]);
  expect(remote.store.review_logs.size).toBe(1);
  expect(await a.meta.get("syncReplace")).toBeUndefined();

  // un dispozitiv nou primește doar progresul importat
  await sync(b);
  expect(await cardIds(b)).toEqual([vocabCardId("w3", "it-ro")]);
});

test("resetarea progresului cu cont șterge și datele din cont", async () => {
  const a = await device();
  await review(a, "w1", 0);
  await sync(a);
  expect(remote.store.cards.size).toBe(1);

  await resetProgress(a);
  await sync(a);
  expect(remote.store.cards.size).toBe(0);
  expect(remote.store.review_logs.size).toBe(0);

  const fresh = await device();
  await sync(fresh);
  expect(await fresh.cards.count()).toBe(0);
});

test("importul sau resetarea fără cont nu cer nicio înlocuire pe server", async () => {
  const solo = await device(false);
  await review(solo, "w1", 0);
  await resetProgress(solo);
  expect(await solo.meta.get("syncReplace")).toBeUndefined();
});
