import type { GeneratedPackItem, Level } from "../content/schema.ts";
import { isUpTo } from "../content/levels.ts";

/** Ce s-a văzut din pachet între vizite: momentul ultimei afișări a itemului și a testului lui (ms). */
export type FeedSeen = Record<string, { shown?: number; quizzed?: number }>;

/** Un item (sau testul lui) nu revine mai devreme de atât. */
export const PACK_COOLDOWN_MS = 3 * 86_400_000;
/** Câte carduri trebuie să treacă, în aceeași vizită, între afișarea unui item și testul lui. */
export const PACK_QUIZ_GAP = 10;

export interface PackVisit {
  /** Începutul vizitei (ms). */
  visitStart: number;
  /** Id-urile itemilor afișați în vizită, cu indexul cardului în care au apărut. */
  shownAt: ReadonlyMap<string, number>;
  /** Itemii al căror test a apărut deja în vizită. */
  quizzed: ReadonlySet<string>;
  /** Câte carduri s-au afișat până acum în vizită. */
  count: number;
}

const oldestFirst = (at: (id: string) => number | undefined) => (a: GeneratedPackItem, b: GeneratedPackItem) =>
  (at(a.id) ?? -Infinity) - (at(b.id) ?? -Infinity);

/** Itemii care pot apărea acum: nevăzuții întâi (în ordinea pachetului), apoi cei văzuți cel mai demult; fără cei din vizita curentă. */
export function eligiblePackItems(
  pack: readonly GeneratedPackItem[],
  seen: FeedSeen,
  visit: PackVisit,
  level: Level,
  now: number,
): GeneratedPackItem[] {
  return pack
    .filter((item) => {
      if (!isUpTo(item.level, level) || visit.shownAt.has(item.id)) return false;
      const shown = seen[item.id]?.shown;
      return shown === undefined || now - shown >= PACK_COOLDOWN_MS;
    })
    .sort(oldestFirst((id) => seen[id]?.shown));
}

/** Itemii cu test al căror test poate apărea acum: itemul a fost văzut, iar testul nu s-a dat în ultimele 3 zile. */
export function eligiblePackQuizzes(
  pack: readonly GeneratedPackItem[],
  seen: FeedSeen,
  visit: PackVisit,
  level: Level,
  now: number,
): GeneratedPackItem[] {
  return pack
    .filter((item) => {
      if (!item.quiz || !isUpTo(item.level, level) || visit.quizzed.has(item.id)) return false;
      const { shown, quizzed } = seen[item.id] ?? {};
      if (quizzed !== undefined && now - quizzed < PACK_COOLDOWN_MS) return false;
      const inThisVisit = visit.shownAt.get(item.id);
      // văzut în vizita curentă: după PACK_QUIZ_GAP carduri; altfel trebuie să fi fost văzut într-o vizită anterioară
      if (inThisVisit !== undefined) return visit.count - inThisVisit >= PACK_QUIZ_GAP;
      return shown !== undefined && shown < visit.visitStart;
    })
    .sort(oldestFirst((id) => seen[id]?.quizzed));
}
