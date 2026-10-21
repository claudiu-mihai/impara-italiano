import type { Mastery } from "../srs/mastery.ts";
import type { Direction } from "../srs/types.ts";
import type { ConjugationMode } from "../settings.ts";
import type { Pos, Tense, TopicExercise, TopicGroup } from "./constants.ts";
import type { CoreWord } from "./types.ts";

export const POS_LABEL: Record<Pos, string> = {
  verb: "verb",
  noun: "substantiv",
  adjective: "adjectiv",
  adverb: "adverb",
  pronoun: "pronume",
  preposition: "prepoziție",
  conjunction: "conjuncție",
  numeral: "numeral",
  interjection: "interjecție",
  expression: "expresie",
};

/** Forma italiană afișată pe card: substantivele apar mereu cu articolul (il libro, l'amico). */
export function italianText(word: Pick<CoreWord, "it" | "pos" | "article">): string {
  if (word.pos !== "noun" || !word.article) return word.it;
  return word.article.endsWith("'") ? `${word.article}${word.it}` : `${word.article} ${word.it}`;
}

/** Textul de pe fața întrebării, în funcție de direcție. */
export function promptText(word: CoreWord, direction: Direction): string {
  return direction === "it-ro" ? italianText(word) : word.ro;
}

/** Textul răspunsului corect, în funcție de direcție. */
export function answerText(word: CoreWord, direction: Direction): string {
  return direction === "it-ro" ? word.ro : italianText(word);
}

export const TENSE_LABEL: Record<Tense, string> = {
  presente: "Prezent (presente)",
  passatoProssimo: "Perfect compus (passato prossimo)",
  imperfetto: "Imperfect (imperfetto)",
  futuro: "Viitor (futuro semplice)",
  condizionale: "Condițional (condizionale)",
  imperativo: "Imperativ afirmativ (imperativo)",
  congiuntivo: "Conjunctiv (congiuntivo presente)",
};

/** Cele 6 persoane, în ordinea din datele de conjugare. */
export const PERSONS = [
  { it: "io", ro: "eu" },
  { it: "tu", ro: "tu" },
  { it: "lui/lei", ro: "el/ea" },
  { it: "noi", ro: "noi" },
  { it: "voi", ro: "voi" },
  { it: "loro", ro: "ei/ele" },
] as const;

/** Persoanele imperativului, în ordinea din datele de conjugare (nu există „io”). */
export const IMPERATIVE_PERSONS = [
  { it: "tu", ro: "tu" },
  { it: "Lei", ro: "dvs." },
  { it: "noi", ro: "noi" },
  { it: "voi", ro: "voi" },
  { it: "Loro", ro: "dvs. (pl.)" },
] as const;

/** Etichetele persoanelor pentru un timp: imperativul are 5, celelalte 6. */
export function personsOf(tense: Tense): readonly { it: string; ro: string }[] {
  return tense === "imperativo" ? IMPERATIVE_PERSONS : PERSONS;
}

export const TOPIC_GROUP_LABEL: Record<TopicGroup, string> = {
  timp: "Timp",
  numere: "Numere",
  spatiu: "Spațiu",
  oameni: "Oameni",
  "zi-de-zi": "Zi de zi",
  oras: "Oraș și călătorii",
  conversatie: "Conversație",
};

export const CONJUGATION_MODE_LABEL: Record<ConjugationMode, string> = {
  write: "Scrie",
  flip: "Flip",
  table: "Tabel",
};

export const EXERCISE_LABEL: Record<TopicExercise, string> = {
  match: "Potrivește perechi",
  order: "Ordonează",
  numbers: "Ascultă și scrie cifrele",
  clock: "Ceasul",
  cat: "Unde e pisica?",
};

export const EXERCISE_ICON: Record<TopicExercise, string> = {
  match: "🧩",
  order: "🔢",
  numbers: "🎧",
  clock: "🕒",
  cat: "🐱",
};

export const LEVEL_LABEL: Record<Mastery, string> = {
  new: "Nou",
  learning: "În învățare",
  mastered: "Stăpânit",
};
