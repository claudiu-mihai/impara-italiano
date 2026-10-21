import type { Level, Tense } from "../content/constants.ts";
import { conjCardId, type StoredCard } from "../srs/types.ts";
import { unlockedTenses } from "../srs/unlock.ts";
import { endOfStudyDay, studyDayOf } from "../time/studyDay.ts";
import { isDue } from "./buildDailySession.ts";
import { interleave } from "./interleave.ts";

export interface ConjItem {
  cardId: string;
  verbId: string;
  tense: Tense;
  isNew: boolean;
}

export interface ConjSettings {
  level: Level;
  newConjPerDay: number;
  maxReviewsPerDay: number;
}

/** Un verb pentru care există forme conjugate. */
export interface ConjVerb {
  id: string;
  rank: number;
  level: Level;
  tenses: readonly Tense[];
}

export interface BuildConjSessionArgs {
  now: Date;
  settings: ConjSettings;
  cards: StoredCard[];
  verbs: readonly ConjVerb[];
  reviewsDoneToday: number;
}

/** Coada de conjugare: repetițiile scadente, cu timpuri noi deblocate intercalate. */
export function buildConjugationSession({
  now,
  settings,
  cards,
  verbs,
  reviewsDoneToday,
}: BuildConjSessionArgs): ConjItem[] {
  const today = studyDayOf(now);
  const endOfDay = endOfStudyDay(now);
  const conj = cards.filter((c) => c.kind === "conj");

  const reviewBudget = Math.max(0, settings.maxReviewsPerDay - reviewsDoneToday);
  const reviews = conj
    .filter((c) => isDue(c, now, endOfDay))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, reviewBudget)
    .map((c): ConjItem => ({ cardId: c.cardId, verbId: c.wordId, tense: c.variant as Tense, isNew: false }));

  const newBudget = Math.max(0, settings.newConjPerDay - conj.filter((c) => c.introducedOn === today).length);
  const fresh: ConjItem[] = [];

  for (const verb of [...verbs].sort((a, b) => a.rank - b.rank)) {
    if (fresh.length >= newBudget) break;
    const vocabCards = cards.filter((c) => c.kind === "vocab" && c.wordId === verb.id);
    const conjCards = conj.filter((c) => c.wordId === verb.id);
    for (const tense of unlockedTenses({
      verbLevel: verb.level,
      currentLevel: settings.level,
      vocabCards,
      conjCards,
      available: verb.tenses,
    })) {
      if (fresh.length >= newBudget) break;
      if (conjCards.some((c) => c.variant === tense)) continue;
      fresh.push({ cardId: conjCardId(verb.id, tense), verbId: verb.id, tense, isNew: true });
    }
  }

  return interleave(reviews, fresh);
}
