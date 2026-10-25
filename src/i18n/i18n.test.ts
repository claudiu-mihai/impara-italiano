import { beforeAll, expect, test } from "vitest";
import { it } from "./it.ts";
import { ro, type Key } from "./ro.ts";
import { loadItalian, localeOf, splitTemplate, translate, translatePlural } from "./translate.ts";

beforeAll(loadItalian);

const keys = Object.keys(ro) as Key[];
/** Texte care încep cu spațiu intenționat: se lipesc de alt text (părți de propoziție). */
const SPACED = new Set<string>(["quiz.srCorrect", "quiz.srWrong", "settings.declaredLocal", "settings.inCloud", "settings.resetScope"]);
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

test("italiana are exact aceleași chei ca româna", () => {
  expect(Object.keys(it).sort()).toEqual([...keys].sort());
});

test("niciun text gol sau cu spații la capete, în nicio limbă", () => {
  for (const key of keys) {
    for (const [name, dictionary] of [["ro", ro], ["it", it]] as const) {
      const text = dictionary[key];
      expect(text.length, `${name}: ${key}`).toBeGreaterThan(0);
      if (!SPACED.has(key)) expect(text, `${name}: ${key}`).toBe(text.trim());
    }
  }
});

test("locurile {nume} sunt aceleași în română și în italiană", () => {
  for (const key of keys) expect(placeholders(it[key]), key).toEqual(placeholders(ro[key]));
});

test("fiecare text cu plural are forma _other, în ambele limbi", () => {
  for (const key of keys.filter((k) => k.endsWith("_one"))) {
    const base = key.slice(0, -"_one".length);
    expect(ro[`${base}_other` as Key], base).toBeDefined();
    expect(it[`${base}_other` as Key], base).toBeDefined();
  }
});

test("textele se completează cu parametri", () => {
  expect(translate("ro", "common.backTo", { label: "Teme" })).toBe("Înapoi la Teme");
  expect(translate("it", "common.backTo", { label: "Temi" })).toBe("Torna a Temi");
  // un loc necompletat rămâne vizibil, nu devine „undefined”
  expect(translate("it", "common.backTo")).toBe("Torna a {label}");
});

test("pluralele: 1, 2 și 20 în română și în italiană", () => {
  const ro = (n: number) => translatePlural("ro", "home.streak", n);
  expect(ro(1)).toBe("1 zi la rând");
  expect(ro(2)).toBe("2 zile la rând");
  expect(ro(20)).toBe("20 zile la rând");
  const it = (n: number) => translatePlural("it", "home.streak", n);
  expect(it(1)).toBe("1 giorno di fila");
  expect(it(2)).toBe("2 giorni di fila");
  expect(it(20)).toBe("20 giorni di fila");
  expect(it(0)).toBe("0 giorni di fila");
});

test("pluralul cu mai mulți parametri", () => {
  expect(translatePlural("it", "stats.calendarAria", 1, { weeks: 12 })).toBe("Attività nelle ultime 12 settimane: 1 giorno con ripetizioni");
  expect(translatePlural("ro", "stats.calendarAria", 3, { weeks: 12 })).toBe("Activitate în ultimele 12 săptămâni: 3 zile cu repetiții");
});

test("textele cu noduri se împart la fiecare {nume}", () => {
  expect(splitTemplate("ro", "about.version")).toEqual(["Impara l'Italiano · versiune ", "version", ""]);
  expect(splitTemplate("it", "about.version")).toEqual(["Impara l'Italiano · versione ", "version", ""]);
});

test("limba interfeței alege locala pentru date și numere", () => {
  expect(localeOf("ro")).toBe("ro-RO");
  expect(localeOf("it")).toBe("it-IT");
});

test("câmpul limbii interfeței arată mereu ambele limbi", () => {
  expect(ro["settings.uiLanguage"]).toBe(it["settings.uiLanguage"]);
  expect(ro["settings.uiLanguage"]).toContain("Limba interfeței");
  expect(ro["settings.uiLanguage"]).toContain("Lingua dell'interfaccia");
});

test("etichetele de navigare în italiană", () => {
  expect([it["nav.home"], it["nav.learn"], it["nav.browse"], it["nav.stats"], it["nav.settings"]]).toEqual([
    "Home",
    "Impara",
    "Dizionario",
    "Statistiche",
    "Impostazioni",
  ]);
});
