import { UI_LANGUAGES, type UiLanguage } from "../domain/content/constants.ts";
import { loadItalian } from "./translate.ts";

const KEY = "impara.lang";
const listeners = new Set<() => void>();

function stored(): UiLanguage {
  try {
    const value = localStorage.getItem(KEY);
    return UI_LANGUAGES.find((l) => l === value) ?? "ro";
  } catch {
    return "ro";
  }
}

let current: UiLanguage = stored();

export const getUiLanguage = (): UiLanguage => current;

export function subscribeUiLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Schimbă limba interfeței: întâi încarcă dicționarul (italiana se încarcă la cerere), apoi o reține local (ca pagina
 * următoare să pornească direct în ea, fără un „flash” în română; vezi scriptul din index.html), setează `<html lang>`
 * și anunță componentele. Dacă dicționarul nu se poate încărca, interfața rămâne în limba curentă.
 */
export async function setUiLanguage(language: UiLanguage): Promise<void> {
  if (language === "it") {
    try {
      await loadItalian();
    } catch {
      return;
    }
  }
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // fără localStorage limba se aplică doar în această sesiune
  }
  document.documentElement.lang = language;
  if (language === current) return;
  current = language;
  listeners.forEach((listener) => listener());
}

/**
 * La pornire: încarcă dicționarul limbii reținute (dacă e italiana) și setează `<html lang>`. Aplicația se afișează abia
 * după aceea, ca prima imagine să fie direct în limba aleasă.
 */
export async function initUiLanguage(): Promise<void> {
  if (current === "it") {
    try {
      await loadItalian();
    } catch {
      // fără dicționar italian aplicația pornește în română
      current = "ro";
    }
  }
  document.documentElement.lang = current;
}
