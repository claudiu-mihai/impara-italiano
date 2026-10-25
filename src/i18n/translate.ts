import type { UiLanguage } from "../domain/content/constants.ts";
import { ro, type Key, type PluralBase } from "./ro.ts";

/**
 * Româna (sursa cheilor și varianta de rezervă) stă în pachetul principal. Italiana se încarcă la cerere, doar de cine o
 * folosește (~9 KB gzip): până atunci, orice text cerut în italiană apare în română.
 */
let italian: Record<Key, string> | undefined;

/** Încarcă dicționarul italian (o singură dată). Se cheamă înainte de a trece interfața în italiană. */
export async function loadItalian(): Promise<void> {
  italian ??= (await import("./it.ts")).it;
}

const dictionaryOf = (language: UiLanguage): Record<Key, string> => (language === "it" && italian ? italian : ro);

export type Params = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

function fill(template: string, params?: Params): string {
  return params ? template.replace(PLACEHOLDER, (whole, name: string) => String(params[name] ?? whole)) : template;
}

export function translate(language: UiLanguage, key: Key, params?: Params): string {
  return fill(dictionaryOf(language)[key], params);
}

/**
 * Textul potrivit unui număr: caută `<bază>_<categorie>` (one, few, other, după regulile limbii), apoi `<bază>_other`.
 * `{n}` primește numărul. Alte `params` se pot adăuga.
 */
export function translatePlural(language: UiLanguage, base: PluralBase, n: number, params?: Params): string {
  const dictionary = dictionaryOf(language) as Record<string, string>;
  const category = new Intl.PluralRules(language).select(n);
  const template = dictionary[`${base}_${category}`] ?? dictionary[`${base}_other`]!;
  return fill(template, { n, ...params });
}

/** Bucățile unui text cu `{nume}`: pozițiile impare sunt numele locurilor de completat (pentru `rich` din `useT`). */
export function splitTemplate(language: UiLanguage, key: Key): string[] {
  return dictionaryOf(language)[key].split(PLACEHOLDER);
}

/** Eticheta de locală pentru `Intl` și `toLocale…`. */
export const localeOf = (language: UiLanguage): string => (language === "it" ? "it-IT" : "ro-RO");
