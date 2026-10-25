import { z } from "zod";
import {
  LEVELS,
  POS,
  SKILLS,
  TENSES,
  TOPIC_EXERCISES,
  TOPIC_GROUPS,
  type Level,
  type Pos,
  type Tense,
} from "./constants.ts";

// Schemele conținutului. Sunt folosite atât la build (scripts/) cât și în aplicație.

const text = z
  .string()
  .min(1)
  .refine((s) => s === s.trim(), "spații la începutul sau la sfârșitul textului");

const example = z.object({ it: text, ro: text }).strict();

/** Text în italiană și în limba maternă (chei: `it` și codurile din NATIVE_LANGUAGES). */
const localized = z.object({ it: text, ro: text }).strict();

const baseShape = {
  id: z.string().regex(/^[a-z]{1,3}-[\p{L}'_-]+$/u, "id invalid (ex. v-parlare)"),
  it: text,
  ro: text,
  tags: z.array(text),
  rank: z.number().int().positive(),
  // Nu se scrie în fișiere: se calculează la build din frecvență (vezi content/levels.json).
  level: z.enum(LEVELS).optional(),
  examples: z.array(example).min(1),
  falseFriend: text.optional(),
  note: text.optional(),
};

export const verbSchema = z
  .object({
    ...baseShape,
    pos: z.literal("verb"),
    group: z.enum(["are", "ere", "ire", "isc"]),
    auxiliary: z.enum(["avere", "essere", "both"]),
    pastParticiple: text,
    irregular: z.boolean(),
    reflexive: z.boolean(),
  })
  .strict();

export const nounSchema = z
  .object({
    ...baseShape,
    pos: z.literal("noun"),
    gender: z.enum(["m", "f"]),
    article: z.enum(["il", "lo", "la", "l'"]),
    plural: text,
    pluralArticle: z.enum(["i", "gli", "le"]),
    irregularPlural: z.boolean(),
    /** Substantiv fără plural uzual (luni, „fame”, „gente”): pluralul nu se afișează. */
    uncountable: z.boolean().optional(),
  })
  .strict();

export const adjectiveSchema = z
  .object({
    ...baseShape,
    pos: z.literal("adjective"),
    forms: z.object({ ms: text, fs: text, mp: text, fp: text }).strict(),
  })
  .strict();

// Generic, ca `pos` să rămână un literal și uniunea să poată fi discriminată după el.
const simpleSchema = <P extends Pos>(pos: P) =>
  z.object({ ...baseShape, pos: z.literal(pos) }).strict();

export const wordSchema = z.discriminatedUnion("pos", [
  verbSchema,
  nounSchema,
  adjectiveSchema,
  simpleSchema("adverb"),
  simpleSchema("pronoun"),
  simpleSchema("preposition"),
  simpleSchema("conjunction"),
  simpleSchema("numeral"),
  simpleSchema("interjection"),
  simpleSchema("expression"),
]);

// 6 persoane (io, tu, lui/lei, noi, voi, loro); fiecare cu una sau mai multe forme acceptate.
const personForms = z.array(z.array(text).min(1)).length(6);
// Imperativ: 5 persoane (tu, Lei, noi, voi, Loro).
const imperativeForms = z.array(z.array(text).min(1)).length(5);

export const conjugationsSchema = z.record(
  z.string(),
  z
    .object({
      presente: personForms.optional(),
      passatoProssimo: personForms.optional(),
      imperfetto: personForms.optional(),
      futuro: personForms.optional(),
      condizionale: personForms.optional(),
      imperativo: imperativeForms.optional(),
      congiuntivo: personForms.optional(),
    })
    .strict(),
);

export const topicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id invalid (ex. zilele-saptamanii)"),
    title: localized,
    group: z.enum(TOPIC_GROUPS),
    level: z.enum(LEVELS),
    /** ★ = prima etapă (Faza 4). */
    first: z.boolean(),
    intro: text.optional(),
    /** 1–4 reguli ale limbii italiane: `it` pe fața italiană a casetei „De reținut”, traducerea pe cea în limba maternă. */
    rules: z.array(localized).min(1).max(4),
    /** Reguli comparate cu limba maternă (doar pe fața în limba maternă), grupate după codul limbii. */
    contrast: z.object({ ro: z.array(text).min(1).max(4) }).strict().optional(),
    subgroups: z.array(z.object({ title: localized, wordIds: z.array(z.string()).min(1) }).strict()).min(1),
    exercises: z.array(z.enum(TOPIC_EXERCISES)),
    /** Secvență ciclică (zile, luni, anotimpuri): după ultimul element vine primul. */
    cyclic: z.boolean().optional(),
    /** Ordinea corectă pentru exercițiul „Ordonează” (id-uri de cuvinte). */
    sequence: z.array(z.string()).min(3).optional(),
    /** Abilitatea cu itemi generați, dacă tema are una. */
    skill: z.enum(SKILLS).optional(),
  })
  .strict();

export const grammarItemSchema = z
  .object({
    id: z.string().regex(/^[a-z]+(-[a-z0-9]+)*$/, "id invalid (ex. art-01)"),
    /** Expresia sau propoziția completă, corectă. */
    it: text,
    /** Cuvântul din `it` care se ascunde în jocuri (un cuvânt întreg sau un articol cu apostrof, ca „l'”). */
    gap: text,
    ro: text,
    /** Explicația alegerii, afișată pe spatele cartonașului. */
    note: text.optional(),
  })
  .strict();

export const grammarTopicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id invalid (ex. articoli)"),
    /** Poziția în ordinea de învățare a gramaticii (1, 2, 3…). */
    order: z.number().int().positive(),
    title: text,
    level: z.enum(LEVELS),
    rules: z.array(text).min(1).max(4),
    // cel puțin o sesiune întreagă (10), ca runda să nu repete aceleași exemple
    items: z.array(grammarItemSchema).min(10),
  })
  .strict();

export const metaSchema = z
  .object({
    dataVersion: z.string().min(1),
    generatedAt: z.string(),
    rankBasis: z.enum(["provisional", "frequency-lists"]),
    wordCount: z.number().int().nonnegative(),
    sources: z.array(
      z.object({ name: text, url: text, license: text, role: text }).strict(),
    ),
  })
  .strict();

export const sentenceSchema = z
  .object({
    id: z.string().min(1),
    wordIds: z.array(z.string()).min(1),
    it: text,
    ro: text,
    tokens: z.array(text).min(3).max(10),
    punctuation: z.string(),
    // Ordinile acceptate, ca indici peste `tokens`; prima este ordinea originală.
    acceptedOrders: z.array(z.array(z.number().int().nonnegative())).min(1),
  })
  .strict();

export const sentencesSchema = z.array(sentenceSchema);

export type { Level, Pos, Tense };
export { LEVELS, POS, TENSES };
/** Un cuvânt complet, după build: nivelul este mereu setat. */
export type Word = z.infer<typeof wordSchema> & { level: Level };
/** Verbul așa cum e citit din fișiere (nivelul se adaugă la build). */
export type ParsedVerb = z.infer<typeof verbSchema>;
export type Verb = Extract<Word, { pos: "verb" }>;
export type Topic = z.infer<typeof topicSchema>;
/** Un text în italiană și în limba maternă. */
export type Localized = z.infer<typeof localized>;
export type Sentence = z.infer<typeof sentenceSchema>;
export type GrammarItem = z.infer<typeof grammarItemSchema>;
export type GrammarTopic = z.infer<typeof grammarTopicSchema>;
export type Conjugations = z.infer<typeof conjugationsSchema>;
export type ContentMeta = z.infer<typeof metaSchema>;
