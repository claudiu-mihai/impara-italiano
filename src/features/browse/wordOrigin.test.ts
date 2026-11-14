import { expect, test } from "vitest";
import { readWordOrigin, wordOriginState } from "./wordOrigin.ts";

test("starea purtată de link se citește înapoi", () => {
  const state = wordOriginState({ path: "/learn/topics/culori", label: "I colori" });
  expect(readWordOrigin(state)).toEqual({ path: "/learn/topics/culori", label: "I colori" });
});

test("fără stare, cu stare străină sau stricată: nicio origine (butonul rămâne spre Dicționar)", () => {
  expect(readWordOrigin(undefined)).toBeUndefined();
  expect(readWordOrigin(null)).toBeUndefined();
  expect(readWordOrigin({})).toBeUndefined();
  expect(readWordOrigin({ wordFrom: { path: 3, label: "x" } })).toBeUndefined();
  expect(readWordOrigin({ wordFrom: { path: "/x" } })).toBeUndefined();
});

test("doar adrese din aplicație: un link către alt site nu devine buton „Înapoi”", () => {
  expect(readWordOrigin({ wordFrom: { path: "https://exemplu.ro", label: "x" } })).toBeUndefined();
  expect(readWordOrigin({ wordFrom: { path: "//exemplu.ro", label: "x" } })).toBeUndefined();
});
