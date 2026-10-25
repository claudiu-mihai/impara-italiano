import type { Key } from "../../i18n/ro.ts";
import type { Mastery } from "../srs/mastery.ts";
import type { Direction } from "../srs/types.ts";
import type { ConjugationMode } from "../settings.ts";
import type { Pos, Tense, TopicExercise, TopicGroup } from "./constants.ts";
import type { Localized } from "./schema.ts";
import type { CoreWord } from "./types.ts";

/** Cheia textului (în `i18n`) pentru fiecare etichetă: se afișează cu `t(POS_LABEL[pos])`. */
export const POS_LABEL: Record<Pos, Key> = {
  verb: "pos.verb",
  noun: "pos.noun",
  adjective: "pos.adjective",
  adverb: "pos.adverb",
  pronoun: "pos.pronoun",
  preposition: "pos.preposition",
  conjunction: "pos.conjunction",
  numeral: "pos.numeral",
  interjection: "pos.interjection",
  expression: "pos.expression",
};

/** O iconiță pentru fiecare categorie gramaticală (filtrul din Dicționar). */
export const POS_ICON: Record<Pos, string> = {
  verb: "🏃",
  noun: "📦",
  adjective: "🎨",
  adverb: "⚡",
  pronoun: "🙋",
  preposition: "📍",
  conjunction: "🔗",
  numeral: "🔢",
  interjection: "❗",
  expression: "💬",
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

export const TENSE_LABEL: Record<Tense, Key> = {
  presente: "tense.presente",
  passatoProssimo: "tense.passatoProssimo",
  imperfetto: "tense.imperfetto",
  futuro: "tense.futuro",
  condizionale: "tense.condizionale",
  imperativo: "tense.imperativo",
  congiuntivo: "tense.congiuntivo",
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

export const TOPIC_GROUP_LABEL: Record<TopicGroup, Localized> = {
  timp: { it: "Tempo", ro: "Timp" },
  numere: { it: "Numeri", ro: "Numere" },
  spatiu: { it: "Spazio", ro: "Spațiu" },
  oameni: { it: "Persone", ro: "Oameni" },
  "zi-de-zi": { it: "Vita quotidiana", ro: "Zi de zi" },
  oras: { it: "Città e viaggi", ro: "Oraș și călătorii" },
  conversatie: { it: "Conversazione", ro: "Conversație" },
};

export const CONJUGATION_MODE_LABEL: Record<ConjugationMode, Key> = {
  write: "mode.write",
  flip: "mode.flip",
  table: "mode.table",
};

export const EXERCISE_LABEL: Record<TopicExercise, Key> = {
  match: "exercise.match",
  order: "exercise.order",
  numbers: "exercise.numbers",
  clock: "exercise.clock",
  cat: "exercise.cat",
};

export const EXERCISE_ICON: Record<TopicExercise, string> = {
  match: "🧩",
  order: "🔢",
  numbers: "🎧",
  clock: "🕒",
  cat: "🐺",
};

export const LEVEL_LABEL: Record<Mastery, Key> = {
  new: "mastery.new",
  learning: "mastery.learning",
  mastered: "mastery.mastered",
};
