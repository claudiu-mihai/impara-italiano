import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../../domain/settings.ts";
import { createDb, type ImparaDb } from "./db.ts";
import { changeLevel, getSettings, ITALIAN_FIRST_STOPPED, saveSettings } from "./repositories.ts";

let db: ImparaDb;

beforeEach(() => {
  db = createDb(`level-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

test("trecerea peste A oprește „Italiană întâi” și ține minte nivelul pentru mesaj", async () => {
  await saveSettings(db, { ...DEFAULT_SETTINGS, level: "A2" });
  await changeLevel(db, "B1");
  expect(await getSettings(db)).toMatchObject({ level: "B1", italianFirst: false });
  expect((await db.meta.get(ITALIAN_FIRST_STOPPED))?.value).toBe("B1");
});

test("fără oprire automată nu apare niciun mesaj", async () => {
  await saveSettings(db, { ...DEFAULT_SETTINGS, level: "A1" });
  await changeLevel(db, "A2");
  expect((await getSettings(db)).italianFirst).toBe(true);
  expect(await db.meta.get(ITALIAN_FIRST_STOPPED)).toBeUndefined();

  await saveSettings(db, { ...DEFAULT_SETTINGS, level: "B1", italianFirst: false });
  await changeLevel(db, "B2");
  expect(await db.meta.get(ITALIAN_FIRST_STOPPED)).toBeUndefined();
});

test("setările vechi, salvate fără câmpul nou, se citesc după nivel", async () => {
  const { italianFirst: _omit, ...old } = { ...DEFAULT_SETTINGS, level: "B1" as const };
  await db.settings.put({ ...old, key: "app", updatedAt: 1 } as never);
  expect((await getSettings(db)).italianFirst).toBe(false);
});
