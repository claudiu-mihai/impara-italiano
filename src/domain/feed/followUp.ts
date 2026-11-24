import type { Random } from "../random.ts";
import { TEST_TYPES, type FeedItem } from "./types.ts";

const MIN_GAP = 4;
const MAX_GAP = 8;

const isTest = (item: FeedItem | undefined) => item !== undefined && TEST_TYPES.has(item.type);

/**
 * Inserează grila de după un cuvânt nou la 4–8 carduri după `currentIndex`, ca recunoașterea să vină cât cuvântul e
 * proaspăt, dar nu imediat. Dacă locul ales are un test alături, se mută mai departe (nu apar două teste la rând).
 */
export function planFollowUp(items: readonly FeedItem[], currentIndex: number, followUp: FeedItem, random: Random = Math.random): FeedItem[] {
  const wanted = currentIndex + MIN_GAP + Math.floor(random() * (MAX_GAP - MIN_GAP + 1));
  let at = Math.min(wanted, items.length);
  while (at < items.length && (isTest(items[at - 1]) || isTest(items[at]))) at++;
  return [...items.slice(0, at), followUp, ...items.slice(at)];
}
