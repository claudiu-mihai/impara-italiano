import { createElement, Fragment, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { UiLanguage } from "../domain/content/constants.ts";
import { getUiLanguage, subscribeUiLanguage } from "./store.ts";
import { localeOf, splitTemplate, translate, translatePlural, type Params } from "./translate.ts";
import type { Key, PluralBase } from "./ro.ts";

export { getUiLanguage, initUiLanguage, setUiLanguage } from "./store.ts";
export { loadItalian } from "./translate.ts";
export type { Key, PluralBase } from "./ro.ts";

export { t, tp } from "./standalone.ts";

function rich(language: UiLanguage, key: Key, nodes: Record<string, ReactNode>): ReactNode {
  return splitTemplate(language, key).map((part, index) =>
    createElement(Fragment, { key: index }, index % 2 === 1 ? (nodes[part] ?? `{${part}}`) : part),
  );
}

export interface Translator {
  language: UiLanguage;
  locale: string;
  t: (key: Key, params?: Params) => string;
  /** Text potrivit unui număr (`<bază>_one` / `_few` / `_other`), cu `{n}`. */
  tp: (base: PluralBase, n: number, params?: Params) => string;
  /** Text cu noduri React în locul `{nume}`-lor. */
  rich: (key: Key, nodes: Record<string, ReactNode>) => ReactNode;
}

/** Limba curentă a interfeței; componentele se re-randează când se schimbă. */
export function useUiLanguage(): UiLanguage {
  return useSyncExternalStore(subscribeUiLanguage, getUiLanguage, getUiLanguage);
}

/** Traducătorul limbii curente: `const { t } = useT();`. */
export function useT(): Translator {
  const language = useUiLanguage();
  return useMemo(
    () => ({
      language,
      locale: localeOf(language),
      t: (key, params) => translate(language, key, params),
      tp: (base, n, params) => translatePlural(language, base, n, params),
      rich: (key, nodes) => rich(language, key, nodes),
    }),
    [language],
  );
}
