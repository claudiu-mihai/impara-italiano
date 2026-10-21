import type { Card, ReviewLog } from "ts-fsrs";

export type CardKind = "vocab" | "conj" | "skill";
export type Direction = "it-ro" | "ro-it";
export type ReviewSource = "flashcard" | "quiz" | "conj" | "skill";

/** Un card salvat: starea FSRS completă plus identificarea cardului. */
export interface StoredCard extends Card {
  cardId: string;
  wordId: string;
  kind: CardKind;
  /** Direcția (vocabular) sau timpul verbal (conjugare). */
  variant: string;
  /** Ziua de studiu în care cardul a fost introdus. */
  introducedOn: string;
}

export interface ReviewLogEntry {
  id?: number;
  cardId: string;
  /** 1 = Din nou, 2 = Greu, 3 = Bine, 4 = Ușor. */
  rating: number;
  reviewedAt: Date;
  studyDay: string;
  source: ReviewSource;
  durationMs?: number;
  fsrs: ReviewLog;
}

export const vocabCardId = (wordId: string, direction: Direction) => `vocab:${wordId}:${direction}`;
/** Abilitățile cu itemi generați (numere, ora): un singur card pe abilitate. */
export const skillCardId = (skill: string) => `skill:${skill}`;
export const conjCardId = (verbId: string, tense: string) => `conj:${verbId}:${tense}`;
