import { getUiLanguage } from "./store.ts";
import type { Key } from "./ro.ts";
import { translate, translatePlural, type Params } from "./translate.ts";
import type { PluralBase } from "./ro.ts";

/**
 * Traducere în limba curentă a interfeței, pentru cod din afara componentelor (mesaje de eroare, stări). Fără React,
 * ca să poată fi folosită și în module testate în Node.
 */
export const t = (key: Key, params?: Params): string => translate(getUiLanguage(), key, params);

export const tp = (base: PluralBase, n: number, params?: Params): string =>
  translatePlural(getUiLanguage(), base, n, params);
