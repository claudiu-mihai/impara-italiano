// Constante fără dependențe, ca să poată fi importate în aplicație fără a include Zod în bundle.

export const POS = [
  "verb",
  "noun",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "numeral",
  "interjection",
  "expression",
] as const;

/** Timpurile verbale, în ordinea în care se deblochează (cele mai utile primele). */
export const TENSES = [
  "presente",
  "passatoProssimo",
  "imperativo",
  "imperfetto",
  "futuro",
  "condizionale",
  "congiuntivo",
] as const;

/** Nivelurile CEFR, de la cel mai ușor la cel mai greu. */
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type Level = (typeof LEVELS)[number];
export type Pos = (typeof POS)[number];
export type Tense = (typeof TENSES)[number];

/** Limbile interfeței (meniuri, butoane, mesaje); vezi FR8 din plan. */
export const UI_LANGUAGES = ["ro", "it"] as const;

/** Limbile materne cu conținut (traduceri, reguli comparate); deocamdată doar româna. */
export const NATIVE_LANGUAGES = ["ro"] as const;

/** Limba maternă a celui care învață; deocamdată fixă, fără selector (vezi FR7 din plan). */
export const NATIVE_LANGUAGE: NativeLanguage = "ro";

/** Grupurile de teme, în ordinea în care apar în listă. */
export const TOPIC_GROUPS = ["timp", "numere", "spatiu", "oameni", "zi-de-zi", "oras", "conversatie"] as const;

/** Exercițiile specifice temelor. */
export const TOPIC_EXERCISES = ["match", "order", "numbers", "clock", "cat"] as const;

/** Abilități cu itemi generați din reguli (unitate SRS = abilitatea, nu itemul). */
export const SKILLS = ["numbers-0-20", "numbers-21-100", "numbers-big", "clock"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];
export type NativeLanguage = (typeof NATIVE_LANGUAGES)[number];
export type TopicGroup = (typeof TOPIC_GROUPS)[number];
export type TopicExercise = (typeof TOPIC_EXERCISES)[number];
export type Skill = (typeof SKILLS)[number];
