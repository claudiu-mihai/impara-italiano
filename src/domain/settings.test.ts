import { expect, test } from "vitest";
import { DEFAULT_SETTINGS, settingsForLevel, withSettingDefaults, type Settings } from "./settings.ts";

const at = (level: Settings["level"], italianFirst: boolean): Settings => ({ ...DEFAULT_SETTINGS, level, italianFirst });

test("„Italiană întâi” este pornită implicit", () => {
  expect(DEFAULT_SETTINGS.italianFirst).toBe(true);
});

test("trecerea de la A2 la B1 oprește „Italiană întâi”", () => {
  expect(settingsForLevel(at("A2", true), "B1")).toMatchObject({ level: "B1", italianFirst: false });
  expect(settingsForLevel(at("A1", true), "B2")).toMatchObject({ level: "B2", italianFirst: false });
});

test("schimbările în interiorul nivelului A nu o ating", () => {
  expect(settingsForLevel(at("A1", true), "A2").italianFirst).toBe(true);
  expect(settingsForLevel(at("A2", false), "A1").italianFirst).toBe(false);
});

test("revenirea la A nu o repornește", () => {
  expect(settingsForLevel(at("B1", false), "A2")).toMatchObject({ level: "A2", italianFirst: false });
});

test("pornită manual la B1, rămâne pornită la schimbările următoare", () => {
  expect(settingsForLevel(at("B1", true), "B2")).toMatchObject({ level: "B2", italianFirst: true });
});

test("restul setărilor rămân neschimbate la schimbarea nivelului", () => {
  const before = { ...at("A2", true), newPerDay: 7 };
  expect(settingsForLevel(before, "B1")).toEqual({ ...before, level: "B1", italianFirst: false });
});

test("setările vechi, fără câmpul nou, îl primesc după nivelul salvat", () => {
  expect(withSettingDefaults({ level: "A2" }).italianFirst).toBe(true);
  expect(withSettingDefaults({ level: "B1" }).italianFirst).toBe(false);
  expect(withSettingDefaults({}).italianFirst).toBe(true);
});

test("valoarea salvată are prioritate față de cea dedusă din nivel", () => {
  expect(withSettingDefaults({ level: "B1", italianFirst: true }).italianFirst).toBe(true);
  expect(withSettingDefaults({ level: "A1", italianFirst: false }).italianFirst).toBe(false);
});
