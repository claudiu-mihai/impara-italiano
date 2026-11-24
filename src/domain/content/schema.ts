import { z } from "zod";
import { VOICE_NAMES } from "../dialogue/voices.ts";
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

// Formele românești de bază ale unui verb din lista de conjugare (vezi domain/conjugation/romanian.ts).
const six = z.array(text).length(6);
export const romanianVerbSchema = z
  .object({
    id: z.string().regex(/^v-/, "id-ul unui verb începe cu „v-”"),
    inf: text.optional(),
    part: text.optional(),
    pres: six.optional(),
    impf: text.optional(),
    conj3: text.optional(),
    conj: six.optional(),
    imp: z.array(text).length(2).optional(),
    refl: z.enum(["acc", "dat"]).optional(),
    tenses: z
      .object({
        presente: six.optional(),
        passatoProssimo: six.optional(),
        imperfetto: six.optional(),
        futuro: six.optional(),
        condizionale: six.optional(),
        imperativo: z.array(text).length(5).optional(),
        congiuntivo: six.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const topicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id invalid (ex. zilele-saptamanii)"),
    title: localized,
    group: z.enum(TOPIC_GROUPS),
    level: z.enum(LEVELS),
    /** ★ = prima etapă (Faza 4). */
    first: z.boolean(),
    /** Locul în calea de supraviețuire (1, 2, …): temele cu `path` se învață primele, în această ordine (vezi `guidedOrder.ts`). Doar teme A1. */
    path: z.number().int().positive().optional(),
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

/**
 * Un dialog scurt pe o temă (content/dialogues/<id>.json): două personaje, unul jucat de cursant (`you`), 4–8 replici.
 * Regulile care leagă câmpurile între ele sunt în `domain/dialogue/check.ts`.
 */
const dialogueSpeakerSchema = z.object({ id: z.string().min(1), name: localized, gender: z.enum(["m", "f"]).optional() }).strict();

export const dialogueSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*-\d{2}$/, "id invalid (ex. la-bar-01)"),
    topicId: z.string(),
    title: localized,
    /** Reperul „pot să…”, bifat pe Acasă când dialogul e învățat. */
    canDo: localized,
    /** Personajul celălalt are gen (alege vocea audio-ului pregenerat); cel al cursantului nu, îl alege cursantul. */
    speakers: z.tuple([dialogueSpeakerSchema, dialogueSpeakerSchema]),
    /** Personajul jucat de cursant în jocul de rol. */
    you: z.string(),
    lines: z.array(z.object({ speaker: z.string(), it: text, ro: text }).strict()),
  })
  .strict();

/**
 * O poveste de ascultat (content/stories/<id>.json): conversație lungă, cu oricâte personaje, un narator opțional și
 * scene. Nu are joc de rol (cursantul doar ascultă), deci nici gen sau temă. Fiecare personaj are vocea lui fixă
 * (vocile audio-ului pregenerat). Regulile dintre câmpuri sunt în `domain/story/check.ts`.
 */
const storySpeakerSchema = z
  .object({
    id: z.string().min(1),
    name: localized,
    voice: z.enum(VOICE_NAMES),
    /** Naratorul nu e un personaj: replicile lui apar ca legendă, nu ca balon. */
    narrator: z.boolean().optional(),
  })
  .strict();

export const storySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*-\d{2}$/, "id invalid (ex. un-weekend-sulla-neve-01)"),
    level: z.enum(LEVELS),
    title: localized,
    speakers: z.array(storySpeakerSchema).min(2),
    scenes: z
      .array(
        z
          .object({
            title: localized.optional(),
            lines: z.array(z.object({ speaker: z.string(), it: text, ro: text }).strict()).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/**
 * Pachetul de conținut al fluxului (content/feed/*.json): expresii, prieteni falși, cultură, gesturi și micro-povești.
 * Regulile dintre câmpuri (prefixul id-ului, nivelul, testul) sunt în `domain/feed/check.ts`.
 */
export const PACK_KINDS = ["espressione", "falso-amico", "lo-sapevi", "gesto", "micro-storia", "modo-di-dire"] as const;
export const PACK_ID_PREFIX = {
  espressione: "espr-",
  "falso-amico": "falso-",
  "lo-sapevi": "sap-",
  gesto: "gest-",
  "micro-storia": "stor-",
  "modo-di-dire": "modo-",
} as const;

/** Cât de aproape e idiomul de unul românesc: la fel („same”), cu o răsturnare („twist”) sau fără corespondent („different”). */
export const IDIOM_MATCH = ["same", "twist", "different"] as const;
export type IdiomMatch = (typeof IDIOM_MATCH)[number];

export const packQuizSchema = z
  .object({ question: localized, options: z.array(text).min(3).max(4), answer: z.number().int().min(0) })
  .strict();

const packBase = {
  id: z.string().regex(/^[a-z]+-[a-z0-9]+(-[a-z0-9]+)*$/, "id invalid (ex. espr-in-bocca-al-lupo)"),
  /** Se scrie de mână, mai puțin la prietenii falși (se calculează din dicționar). */
  level: z.enum(LEVELS).optional(),
  wordIds: z.array(z.string()).default([]),
  quiz: packQuizSchema.optional(),
};

const packSimpleShape = {
  ...packBase,
  it: text,
  ro: text,
  explain: localized,
  example: example.optional(),
  /** Doar la gesturi. */
  emoji: text.optional(),
};

const packSimple = <K extends Exclude<(typeof PACK_KINDS)[number], "micro-storia" | "modo-di-dire">>(kind: K) =>
  z.object({ ...packSimpleShape, kind: z.literal(kind) }).strict();

/** Un idiom: ca la itemii simpli, plus traducerea cuvânt cu cuvânt, echivalentul românesc și categoria. */
const packModoDiDire = z
  .object({
    ...packSimpleShape,
    kind: z.literal("modo-di-dire"),
    literal: text,
    roEquivalent: text.optional(),
    match: z.enum(IDIOM_MATCH),
  })
  .strict();

const packMicroStory = z
  .object({
    ...packBase,
    kind: z.literal("micro-storia"),
    title: localized,
    speakers: z.array(storySpeakerSchema).min(1),
    lines: z.array(z.object({ speaker: z.string(), it: text, ro: text }).strict()),
  })
  .strict();

export const packItemSchema = z.discriminatedUnion("kind", [
  packSimple("espressione"),
  packSimple("falso-amico"),
  packSimple("lo-sapevi"),
  packSimple("gesto"),
  packMicroStory,
  packModoDiDire,
]);
export const packFileSchema = z.array(packItemSchema).min(1);

export const grammarItemSchema = z
  .object({
    id: z.string().regex(/^[a-z]+(-[a-z0-9]+)*$/, "id invalid (ex. art-01)"),
    /** Expresia sau propoziția completă, corectă. */
    it: text,
    /** Cuvântul din `it` care se ascunde în jocuri (un cuvânt întreg sau un articol cu apostrof, ca „l'”). */
    gap: text,
    ro: text,
    /** Explicația alegerii, afișată pe spatele cartonașului, în limba interfeței. */
    note: text.optional(),
    noteIt: text.optional(),
  })
  .strict()
  .refine((item) => (item.note === undefined) === (item.noteIt === undefined), "„note” și „noteIt” merg împreună");

/**
 * Un bloc din lecția unei teme de gramatică. Textele în română pot conține marcajele `[it]…[/it]` și `[b]…[/b]`
 * (vezi `domain/grammar/markup.ts`), verificate la build.
 */
export const lessonBlockSchema = z.discriminatedUnion("type", [
  // explicațiile au ambele limbi; se afișează în limba interfeței
  z.object({ type: z.literal("text"), ro: text, it: text }).strict(),
  z
    .object({
      type: z.literal("table"),
      caption: text.optional(),
      captionIt: text.optional(),
      head: z.array(z.string()).min(1),
      /** Antetul în italiană, dacă diferă (ex. „italiano / rumeno”). */
      headIt: z.array(z.string()).optional(),
      rows: z.array(z.array(z.string())).min(1),
      /** Rândurile cu celulele descriptive traduse în italiană; traducerile în română rămân ca în `rows`. */
      rowsIt: z.array(z.array(z.string())).optional(),
      /** Coloanele în italiană (de la 0). Implicit: toate, mai puțin prima. */
      itColumns: z.array(z.number().int().nonnegative()).optional(),
    })
    .strict()
    .refine((t) => t.rows.every((row) => row.length === t.head.length), "fiecare rând trebuie să aibă tot atâtea celule cât antetul")
    .refine((t) => (t.caption === undefined) === (t.captionIt === undefined), "„caption” și „captionIt” merg împreună")
    .refine((t) => !t.headIt || t.headIt.length === t.head.length, "„headIt” trebuie să aibă tot atâtea celule cât „head”")
    .refine(
      (t) => !t.rowsIt || (t.rowsIt.length === t.rows.length && t.rowsIt.every((row) => row.length === t.head.length)),
      "„rowsIt” trebuie să aibă aceeași formă ca „rows”",
    ),
  z
    .object({
      type: z.literal("examples"),
      items: z
        .array(
          z
            .object({ it: text, ro: text, note: text.optional(), noteIt: text.optional() })
            .strict()
            .refine((e) => (e.note === undefined) === (e.noteIt === undefined), "„note” și „noteIt” merg împreună"),
        )
        .min(1),
    })
    .strict(),
  z.object({ type: z.literal("trap"), ro: text, it: text }).strict(),
]);

export const grammarTopicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id invalid (ex. articoli)"),
    /** Poziția în ordinea de învățare a gramaticii (1, 2, 3…). */
    order: z.number().int().positive(),
    /** Titlul în italiană și în limba maternă, afișat ca la Teme. */
    title: localized,
    level: z.enum(LEVELS),
    /** Lecția: explicații, tabele, exemple și capcane, afișate înaintea exercițiilor. */
    lesson: z
      .array(lessonBlockSchema)
      .min(3)
      .max(20)
      .refine((blocks) => blocks.some((b) => b.type === "examples"), "lecția trebuie să conțină cel puțin un bloc examples"),
    /** „De reținut”: fața italiană și cea în limba maternă, ca la Teme. */
    rules: z.array(localized).min(1).max(4),
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
export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type Conjugations = z.infer<typeof conjugationsSchema>;
export type ContentMeta = z.infer<typeof metaSchema>;
export type Dialogue = z.infer<typeof dialogueSchema>;
/** Un dialog după build: primește nivelul temei. */
/** Fișierele audio pregenerate ale unei replici, după genul cursantului (`public/audio/dialogues/<fișier>`). */
export type DialogueLineAudio = Partial<Record<"m" | "f", string>>;

export type GeneratedDialogueLine = Dialogue["lines"][number] & { audio?: DialogueLineAudio };

export type Story = z.infer<typeof storySchema>;
/** O poveste după build: fiecare replică are fișierul audio al vocii personajului, dacă a fost generat. */
export type GeneratedStory = Omit<Story, "scenes"> & {
  scenes: (Omit<Story["scenes"][number], "lines"> & { lines: (Story["scenes"][number]["lines"][number] & { audio?: string })[] })[];
};

export type GeneratedDialogue = Omit<Dialogue, "lines"> & { level: Level; lines: GeneratedDialogueLine[] };

export type PackItem = z.infer<typeof packItemSchema>;
export type PackSimpleItem = Exclude<PackItem, { kind: "micro-storia" }>;
export type PackMicroStory = Extract<PackItem, { kind: "micro-storia" }>;
/** Un item după build: nivelul e mereu prezent, iar fișierele audio (din public/audio/feed/) apar doar dacă există. */
export type GeneratedPackItem =
  | (PackSimpleItem & { level: Level; audio?: { it?: string; example?: string } })
  | (Omit<PackMicroStory, "lines"> & { level: Level; lines: (PackMicroStory["lines"][number] & { audio?: string })[] });
