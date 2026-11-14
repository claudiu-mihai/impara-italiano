import type { Level } from "../content/constants.ts";

/** O temă, așa cum o vede ordinea cuvintelor noi: doar id-urile cuvintelor, în ordinea fișei, și locul în cale (dacă are). */
export interface GuideTopic {
  id: string;
  level: Level;
  /** Locul în calea de supraviețuire (1, 2, …); lipsă = tema nu e pe cale. */
  path?: number;
  wordIds: string[];
}

/** La fiecare cuvânt introdus după frecvență vin atâtea cuvinte ghidate: așa rămân și verbele de bază (*essere*, *avere*, *fare*). */
export const GUIDED_PER_FREQUENCY = 2;

/** O temă e „începută” când ai cel puțin atâtea cuvinte din ea… */
export const STARTED_MIN_WORDS = 2;
/** …și cel puțin atâta din ea (o temă mare prinsă doar din întâmplare, prin cuvinte frecvente, nu schimbă ordinea). */
export const STARTED_MIN_SHARE = 0.25;

/**
 * Cuvintele noi „ghidate”, în ordine: întâi ce a mai rămas din temele începute (cele mai avansate primele, fiindcă sunt cele
 * mai aproape de capăt), apoi temele din calea de supraviețuire, în ordinea ei. Cuvintele cunoscute și duplicatele se sar.
 */
export function guidedWordIds(guide: readonly GuideTopic[], known: ReadonlySet<string>): string[] {
  const share = (t: GuideTopic) => t.wordIds.filter((id) => known.has(id)).length / t.wordIds.length;
  const started = guide
    .filter((t) => {
      const have = t.wordIds.filter((id) => known.has(id)).length;
      return have >= STARTED_MIN_WORDS && have < t.wordIds.length && share(t) >= STARTED_MIN_SHARE;
    })
    .sort((a, b) => share(b) - share(a) || (a.path ?? Infinity) - (b.path ?? Infinity));
  const onPath = guide.filter((t) => t.path !== undefined).sort((a, b) => a.path! - b.path!);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...started, ...onPath]) {
    for (const id of t.wordIds) {
      if (known.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Amestecă lista ghidată cu cea după frecvență, GUIDED_PER_FREQUENCY la 1; un cuvânt apare o singură dată. Când o listă se termină, continuă cealaltă. */
export function mergeGuided<T extends { id: string }>(guided: readonly T[], frequency: readonly T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  const take = (item: T) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    out.push(item);
    return true;
  };
  let g = 0;
  let f = 0;
  while (g < guided.length || f < frequency.length) {
    for (let k = 0; k < GUIDED_PER_FREQUENCY && g < guided.length; ) {
      if (take(guided[g++]!)) k++;
    }
    while (f < frequency.length && !take(frequency[f++]!)) {
      /* sare cuvintele deja luate din lista ghidată */
    }
    if (g >= guided.length && f >= frequency.length) break;
  }
  return out;
}
