import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../../domain/settings.ts";
import { createDb, type ImparaDb } from "./db.ts";
import { changeLevel, getSettings, NATIVE_HELP_STOPPED, saveSettings } from "./repositories.ts";

let db: ImparaDb;

beforeEach(() => {
  db = createDb(`level-${Math.random()}`);
});
afterEach(async () => {
  await db.delete();
});

test("trecerea peste A oprește „Traducere în limba maternă” și ține minte nivelul pentru mesaj", async () => {
  await saveSettings(db, { ...DEFAULT_SETTINGS, level: "A2" });
  await changeLevel(db, "B1");
  expect(await getSettings(db)).toMatchObject({ level: "B1", nativeHelp: false });
  expect((await db.meta.get(NATIVE_HELP_STOPPED))?.value).toBe("B1");
});

test("fără oprire automată nu apare niciun mesaj", async () => {
  await saveSettings(db, { ...DEFAULT_SETTINGS, level: "A1" });
  await changeLevel(db, "A2");
  expect((await getSettings(db)).nativeHelp).toBe(true);
  expect(await db.meta.get(NATIVE_HELP_STOPPED)).toBeUndefined();

  await saveSettings(db, { ...DEFAULT_SETTINGS, level: "B1", nativeHelp: false });
  await changeLevel(db, "B2");
  expect(await db.meta.get(NATIVE_HELP_STOPPED)).toBeUndefined();
});

test("setările vechi, salvate fără câmpul nou, se citesc după nivel", async () => {
  const { nativeHelp: _omit, ...old } = { ...DEFAULT_SETTINGS, level: "B1" as const };
  await db.settings.put({ ...old, key: "app", updatedAt: 1 } as never);
  expect((await getSettings(db)).nativeHelp).toBe(false);
});
