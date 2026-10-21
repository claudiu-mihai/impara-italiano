import { createEmptyCard, fsrs, type FSRS, type Grade, type ReviewLog } from "ts-fsrs";
import type { CardKind, StoredCard } from "./types.ts";

const instances = new Map<number, FSRS>();

function schedulerFor(retention: number): FSRS {
  let instance = instances.get(retention);
  if (!instance) {
    // Fuzz-ul evită ca multe carduri să devină scadente în aceeași zi.
    instance = fsrs({ request_retention: retention, enable_fuzz: true });
    instances.set(retention, instance);
  }
  return instance;
}

export interface NewCardInit {
  cardId: string;
  wordId: string;
  kind: CardKind;
  variant: string;
}

export function newStoredCard(init: NewCardInit, now: Date, studyDay: string): StoredCard {
  return { ...createEmptyCard(now), ...init, introducedOn: studyDay };
}

export function reviewStoredCard(
  card: StoredCard,
  grade: Grade,
  now: Date,
  retention: number,
): { card: StoredCard; log: ReviewLog } {
  const { card: next, log } = schedulerFor(retention).next(card, now, grade);
  return { card: { ...card, ...next }, log };
}

/** Momentul scadent pe care l-ar primi cardul pentru fiecare notă (pentru etichetele butoanelor). */
export function previewDue(card: StoredCard, now: Date, retention: number): Record<Grade, Date> {
  const preview = schedulerFor(retention).repeat(card, now);
  return {
    1: preview[1].card.due,
    2: preview[2].card.due,
    3: preview[3].card.due,
    4: preview[4].card.due,
  };
}
