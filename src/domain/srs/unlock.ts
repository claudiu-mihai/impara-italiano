import { State } from "ts-fsrs";
import { TENSES, type Level, type Tense } from "../content/constants.ts";
import { isUpTo, maxLevel, TENSE_LEVEL } from "../content/levels.ts";
import type { StoredCard } from "./types.ts";

/** Stabilitatea (zile) la care un timp se consideră învățat și îl deblochează pe următorul. */
export const TENSE_UNLOCK_STABILITY_DAYS = 7;

export interface UnlockArgs {
  /** Nivelul verbului (din frecvență). */
  verbLevel: Level;
  /** Nivelul curent ales de utilizator. */
  currentLevel: Level;
  /** Cardurile de vocabular ale verbului. */
  vocabCards: readonly StoredCard[];
  /** Cardurile de conjugare ale verbului. */
  conjCards: readonly StoredCard[];
  /** Timpurile pentru care există forme în date. */
  available: readonly Tense[];
}

/**
 * Timpurile deblocate pentru un verb:
 * - conjugarea apare abia după ce verbul a ieșit din faza de învățare la vocabular;
 * - un timp apare doar dacă nivelul lui (cel mai mare dintre nivelul verbului și al timpului) nu depășește nivelul curent;
 * - primul timp (în ordinea din TENSES) e deblocat de la început;
 * - fiecare timp următor se deblochează când cel anterior e învățat (stabilitate ≥ TENSE_UNLOCK_STABILITY_DAYS).
 */
export function unlockedTenses({ verbLevel, currentLevel, vocabCards, conjCards, available }: UnlockArgs): Tense[] {
  if (!vocabCards.some((c) => c.state === State.Review)) return [];

  const ordered = TENSES.filter((t) => available.includes(t));
  const unlocked: Tense[] = [];
  for (const [i, tense] of ordered.entries()) {
    // timpurile sunt ordonate crescător după nivel, deci primul nivel prea mare oprește lanțul
    if (!isUpTo(maxLevel(verbLevel, TENSE_LEVEL[tense]), currentLevel)) break;
    if (i > 0) {
      const previous = conjCards.find((c) => c.variant === ordered[i - 1]);
      if (!previous || previous.stability < TENSE_UNLOCK_STABILITY_DAYS) break;
    }
    unlocked.push(tense);
  }
  return unlocked;
}
