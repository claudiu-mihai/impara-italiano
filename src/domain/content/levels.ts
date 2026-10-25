import type { Key } from "../../i18n/ro.ts";
import { LEVELS, type Level, type Tense } from "./constants.ts";

export const levelIndex = (level: Level): number => LEVELS.indexOf(level);

/** Adevărat dacă `level` este cel curent sau mai ușor (ex. A1 ≤ A2). */
export const isUpTo = (level: Level, current: Level): boolean => levelIndex(level) <= levelIndex(current);

export const maxLevel = (a: Level, b: Level): Level => (levelIndex(a) >= levelIndex(b) ? a : b);

export const nextLevel = (level: Level): Level | undefined => LEVELS[levelIndex(level) + 1];

/** Grupele mari ale nivelurilor CEFR, pentru filtre simple: A = A1–A2, B = B1–B2, C = C1–C2. */
export const LEVEL_GROUPS = ["A", "B", "C"] as const;
export type LevelGroup = (typeof LEVEL_GROUPS)[number];

export const levelGroupOf = (level: Level): LevelGroup => level[0] as LevelGroup;

/** Cheile textelor (în `i18n`) pentru numele grupelor, în tooltip și etichetă accesibilă: `t(LEVEL_GROUP_LABEL[group])`. */
export const LEVEL_GROUP_LABEL: Record<LevelGroup, Key> = {
  A: "levelGroup.A",
  B: "levelGroup.B",
  C: "levelGroup.C",
};

/** Cheile numelor nivelurilor (Începător, Elementar…): `t(LEVEL_NAME[level])`. */
export const LEVEL_NAME: Record<Level, Key> = {
  A1: "level.A1",
  A2: "level.A2",
  B1: "level.B1",
  B2: "level.B2",
  C1: "level.C1",
  C2: "level.C2",
};

/**
 * Nivelul de la care se învață fiecare timp verbal (estimare după programele uzuale de italiană):
 * presente și passato prossimo sunt necesare în vorbirea de zi cu zi încă de la început.
 */
export const TENSE_LEVEL: Record<Tense, Level> = {
  presente: "A1",
  passatoProssimo: "A1",
  imperativo: "A1",
  imperfetto: "A2",
  futuro: "A2",
  condizionale: "A2",
  congiuntivo: "B1",
};
