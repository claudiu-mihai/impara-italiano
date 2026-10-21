import type { StoredCard } from "./types.ts";

/** Stabilitatea (în zile) de la care un cuvânt se consideră stăpânit. */
export const MASTERED_STABILITY_DAYS = 21;

export type Mastery = "new" | "learning" | "mastered";

/** Nivelul unui cuvânt = cel mai slab card al lui (minimul stabilității). */
export function masteryOf(cards: Pick<StoredCard, "stability">[]): Mastery {
  if (cards.length === 0) return "new";
  const weakest = Math.min(...cards.map((c) => c.stability));
  return weakest >= MASTERED_STABILITY_DAYS ? "mastered" : "learning";
}

/** Nivelul fiecărui cuvânt, calculat din cardurile lui de vocabular. */
export function masteryByWord(cards: StoredCard[]): Map<string, Mastery> {
  const grouped = new Map<string, StoredCard[]>();
  for (const card of cards) {
    if (card.kind !== "vocab") continue;
    const list = grouped.get(card.wordId);
    if (list) list.push(card);
    else grouped.set(card.wordId, [card]);
  }
  return new Map([...grouped].map(([wordId, list]) => [wordId, masteryOf(list)]));
}
