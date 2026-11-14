import type { Rating as FsrsRating, State as FsrsState } from "ts-fsrs";

// Valorile enum-urilor din ts-fsrs, copiate aici ca ecranul de start să nu încarce toată biblioteca: un singur import
// de valoare din „ts-fsrs” (chiar și doar `State`) trage în pachetul de pornire întregul planificator (~9 KB gzip).
// Planificatorul propriu-zis (scheduler.ts) se încarcă doar de ecranele care notează carduri.
// fsrsConstants.test.ts verifică că valorile rămân aceleași cu cele din ts-fsrs.

export const State = {
  New: 0 as FsrsState.New,
  Learning: 1 as FsrsState.Learning,
  Review: 2 as FsrsState.Review,
  Relearning: 3 as FsrsState.Relearning,
} as const;
export type State = FsrsState;

export const Rating = {
  Manual: 0 as FsrsRating.Manual,
  Again: 1 as FsrsRating.Again,
  Hard: 2 as FsrsRating.Hard,
  Good: 3 as FsrsRating.Good,
  Easy: 4 as FsrsRating.Easy,
} as const;
export type Rating = FsrsRating;
