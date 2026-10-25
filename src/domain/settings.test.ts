import { expect, test } from "vitest";
import { DEFAULT_SETTINGS, settingsForLevel, withSettingDefaults, type Settings } from "./settings.ts";

const at = (level: Settings["level"], nativeHelp: boolean): Settings => ({ ...DEFAULT_SETTINGS, level, nativeHelp });

test("„Traducere în limba maternă” este pornită implicit", () => {
  expect(DEFAULT_SETTINGS.nativeHelp).toBe(true);
});

test("trecerea de la A2 la B1 oprește „Traducere în limba maternă”", () => {
  expect(settingsForLevel(at("A2", true), "B1")).toMatchObject({ level: "B1", nativeHelp: false });
  expect(settingsForLevel(at("A1", true), "B2")).toMatchObject({ level: "B2", nativeHelp: false });
});

test("schimbările în interiorul nivelului A nu o ating", () => {
  expect(settingsForLevel(at("A1", true), "A2").nativeHelp).toBe(true);
  expect(settingsForLevel(at("A2", false), "A1").nativeHelp).toBe(false);
});

test("revenirea la A nu o repornește", () => {
  expect(settingsForLevel(at("B1", false), "A2")).toMatchObject({ level: "A2", nativeHelp: false });
});

test("pornită manual la B1, rămâne pornită la schimbările următoare", () => {
  expect(settingsForLevel(at("B1", true), "B2")).toMatchObject({ level: "B2", nativeHelp: true });
});

test("restul setărilor rămân neschimbate la schimbarea nivelului", () => {
  const before = { ...at("A2", true), newPerDay: 7 };
  expect(settingsForLevel(before, "B1")).toEqual({ ...before, level: "B1", nativeHelp: false });
});

test("setările vechi, fără câmpul nou, îl primesc după nivelul salvat", () => {
  expect(withSettingDefaults({ level: "A2" }).nativeHelp).toBe(true);
  expect(withSettingDefaults({ level: "B1" }).nativeHelp).toBe(false);
  expect(withSettingDefaults({}).nativeHelp).toBe(true);
});

test("valoarea salvată are prioritate față de cea dedusă din nivel", () => {
  expect(withSettingDefaults({ level: "B1", nativeHelp: true }).nativeHelp).toBe(true);
  expect(withSettingDefaults({ level: "A1", nativeHelp: false }).nativeHelp).toBe(false);
});

test("limba interfeței este româna implicit și nu depinde de nivel", () => {
  expect(DEFAULT_SETTINGS.uiLanguage).toBe("ro");
  expect(withSettingDefaults({ level: "B2" }).uiLanguage).toBe("ro");
  expect(withSettingDefaults({ uiLanguage: "it" }).uiLanguage).toBe("it");
  expect(settingsForLevel({ ...at("A2", true), uiLanguage: "it" }, "B1").uiLanguage).toBe("it");
});
