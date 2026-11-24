import type { GeneratedPackItem } from "../content/schema.ts";
import type { SessionItem } from "../session/buildDailySession.ts";
import type { Direction } from "../srs/types.ts";

/** O întrebare cu variante: din quiz-ul cuvintelor, sau grila de după un cuvânt nou (`followUp`). */
export interface FeedGridQuestion {
  wordId: string;
  cardId: string;
  direction: Direction;
  options: string[];
  correctIndex: number;
  /** „Din auz”: cuvântul italian se aude, iar textul se vede după răspuns. */
  listen: boolean;
  /** Grila de după un „Cuvânt nou” notat: se notează în repetare (dacă e IT → RO și scadent), nu e exersare liberă. */
  followUp: boolean;
}

/** Un card din flux. `key` e unic și stabil în vizită, ca ecranul și regulile de ordine să se poată referi la el. */
export type FeedItem =
  | { type: "review"; key: string; item: SessionItem }
  | { type: "newWord"; key: string; item: SessionItem }
  | { type: "knownWord"; key: string; wordId: string }
  | { type: "sentence"; key: string; sentenceId: string }
  | { type: "rule"; key: string; grammarId: string; ruleIndex: number }
  /** La povești, `start` numără replicile tuturor scenelor, la rând. */
  | { type: "lines"; key: string; source: "dialogue" | "story"; sourceId: string; start: number; count: number }
  | { type: "didYouKnow"; key: string; wordId: string; field: "note" | "falseFriend" }
  | { type: "grid"; key: string; question: FeedGridQuestion }
  | { type: "trueFalse"; key: string; wordId: string; direction: Direction; shown: string; isTrue: boolean }
  | { type: "gap"; key: string; grammarId: string; itemId: string; options: string[]; correctIndex: number }
  | { type: "pack"; key: string; packId: string }
  | { type: "packQuiz"; key: string; packId: string }
  | { type: "milestone"; key: string; count: number }
  | { type: "reviewsDone"; key: string }
  | { type: "endOfMaterial"; key: string };

export type FeedItemType = FeedItem["type"];

/** Testele de o atingere: nu apar niciodată două la rând. */
export const TEST_TYPES: ReadonlySet<FeedItemType> = new Set<FeedItemType>(["grid", "trueFalse", "gap", "packQuiz"]);
/** Cardurile din pachetul nou (itemul sau testul lui). */
export const PACK_TYPES: ReadonlySet<FeedItemType> = new Set<FeedItemType>(["pack", "packQuiz"]);

/** Cuvintele unui card, pentru regula „același cuvânt de cel mult o dată la 10 carduri”. */
export function wordsOf(item: FeedItem, pack: ReadonlyMap<string, GeneratedPackItem>): string[] {
  switch (item.type) {
    case "review":
    case "newWord":
      return [item.item.wordId];
    case "knownWord":
    case "didYouKnow":
    case "trueFalse":
      return [item.wordId];
    case "grid":
      return [item.question.wordId];
    case "pack":
    case "packQuiz":
      return pack.get(item.packId)?.wordIds ?? [];
    default:
      return [];
  }
}
