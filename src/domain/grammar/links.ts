import type { Pos, Tense } from "../content/constants.ts";

/**
 * Lecția de gramatică potrivită pentru un cuvânt sau un timp verbal. Toate legăturile stau aici; build-ul verifică
 * faptul că fiecare id există în content/grammar.
 */
export const GRAMMAR_LINKS = {
  verbRegular: "presente-regolare",
  verbIrregular: "presente-irregolare",
  // la prezent, verbele neregulate primesc lecția lor (vezi lessonForTense)
  tense: { presente: "presente-regolare" } as Partial<Record<Tense, string>>,
} as const;

/** Toate id-urile de lecții folosite în legături (pentru verificarea de la build). */
export function linkedLessonIds(): string[] {
  const { tense, ...fixed } = GRAMMAR_LINKS;
  return [...new Set([...Object.values(fixed), ...Object.values(tense)])];
}

/**
 * Lecția pentru fișa unui cuvânt: doar verbele regulate la prezent au link. Verbele neregulate la prezent nu au
 * (lecția despre ele trimite deja la lista lor din Dicționar), iar substantivele și adjectivele nici atât.
 */
export function lessonForWord(pos: Pos, wordId: string, irregularPresente: ReadonlySet<string>): string | undefined {
  return pos === "verb" && !irregularPresente.has(wordId) ? GRAMMAR_LINKS.verbRegular : undefined;
}

/** Lecția pentru un timp verbal din conjugare; la prezent, verbele neregulate primesc lecția despre ele. */
export function lessonForTense(tense: Tense, verbId: string, irregularPresente: ReadonlySet<string>): string | undefined {
  const lesson = GRAMMAR_LINKS.tense[tense];
  if (tense === "presente" && lesson && irregularPresente.has(verbId)) return GRAMMAR_LINKS.verbIrregular;
  return lesson;
}
