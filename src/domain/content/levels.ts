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

/** Cum se numește grupa în interfață (tooltip și etichetă accesibilă). */
export const LEVEL_GROUP_LABEL: Record<LevelGroup, string> = {
  A: "Nivel A (A1–A2): începător și elementar",
  B: "Nivel B (B1–B2): intermediar",
  C: "Nivel C (C1–C2): avansat",
};

export const LEVEL_NAME: Record<Level, string> = {
  A1: "Începător",
  A2: "Elementar",
  B1: "Intermediar",
  B2: "Intermediar avansat",
  C1: "Avansat",
  C2: "Competență deplină",
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
