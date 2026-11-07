import type { Pos, Tense } from "../content/constants.ts";

/**
 * Lecția de gramatică potrivită pentru un cuvânt sau un timp verbal. Toate legăturile stau aici; build-ul verifică
 * faptul că fiecare id există în content/grammar.
 */
export const GRAMMAR_LINKS = {
  noun: "genere-plurale",
  adjective: "aggettivi",
  verbRegular: "presente-regolare",
  verbIrregular: "presente-irregolare",
  tense: {} as Partial<Record<Tense, string>>,
} as const;

/** Toate id-urile de lecții folosite în legături (pentru verificarea de la build). */
export function linkedLessonIds(): string[] {
  const { tense, ...fixed } = GRAMMAR_LINKS;
  return [...Object.values(fixed), ...Object.values(tense)];
}

const verbLesson = (verbId: string, irregularPresente: ReadonlySet<string>) =>
  irregularPresente.has(verbId) ? GRAMMAR_LINKS.verbIrregular : GRAMMAR_LINKS.verbRegular;

/** Lecția pentru fișa unui cuvânt: substantiv, adjectiv sau verb (după prezent: regulat sau neregulat). */
export function lessonForWord(pos: Pos, wordId: string, irregularPresente: ReadonlySet<string>): string | undefined {
  if (pos === "noun") return GRAMMAR_LINKS.noun;
  if (pos === "adjective") return GRAMMAR_LINKS.adjective;
  if (pos === "verb") return verbLesson(wordId, irregularPresente);
  return undefined;
}

/** Lecția pentru un timp verbal din conjugare; prezentul alege între regulat și neregulat. */
export function lessonForTense(tense: Tense, verbId: string, irregularPresente: ReadonlySet<string>): string | undefined {
  return tense === "presente" ? verbLesson(verbId, irregularPresente) : GRAMMAR_LINKS.tense[tense];
}
