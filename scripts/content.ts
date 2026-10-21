import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ZodError } from "zod";
import {
  conjugationsSchema,
  sentencesSchema,
  topicSchema,
  type Topic,
  wordSchema,
  type Conjugations,
  type Sentence,
  type ParsedVerb,
  type Word,
} from "../src/domain/content/schema.ts";
import { acceptedOrders, tokenizeSentence } from "../src/domain/sentence/tokenize.ts";
import { loadFrequency } from "./frequency/ranks.ts";
import { LEVELS, TOPIC_GROUPS, type Level } from "../src/domain/content/constants.ts";
import { lemmaOf } from "../src/domain/content/reflexive.ts";
import { buildConjugations, type IrregularFile } from "./conjugate/build.ts";
import { z } from "zod";

export const ROOT = resolve(import.meta.dirname, "..");
const WORDS_DIR = resolve(ROOT, "content/words");
const IRREGULAR_FILE = resolve(ROOT, "content/verbs/irregular.json");
const SENTENCES_DIR = resolve(ROOT, "content/sentences");
const TOPICS_DIR = resolve(ROOT, "content/topics");

/** Propozițiile mai scurte de atât nu fac un exercițiu de ordonare. */
const MIN_TOKENS = 3;

/** Un cuvânt așa cum este citit din fișiere, înainte de a primi nivelul. */
type ParsedWord = z.infer<typeof wordSchema>;

export interface LoadedContent {
  /** „frequency-lists” dacă toate cuvintele au rang din listele de frecvență, altfel „provisional”. */
  rankBasis: "provisional" | "frequency-lists";
  frequencySources: string[];
  words: Word[];
  conjugations: Conjugations;
  sentences: Sentence[];
  topics: Topic[];
  explicitPresenteCount: number;
  errors: string[];
}

function formatZodError(prefix: string, error: ZodError): string[] {
  return error.issues.map((issue) => `${prefix} ${issue.path.join(".")}: ${issue.message}`);
}

/** Încarcă tranșele de cuvinte, le validează cu Zod și generează conjugările. */
export function loadContent(): LoadedContent {
  const errors: string[] = [];
  const words: ParsedWord[] = [];

  const files = readdirSync(WORDS_DIR)
    .filter((f) => /^tranche-.*\.json$/.test(f))
    .sort();

  for (const file of files) {
    const raw: unknown = JSON.parse(readFileSync(resolve(WORDS_DIR, file), "utf8"));
    const entries = Array.isArray(raw) ? raw : [];
    if (!Array.isArray(raw)) errors.push(`${file}: fișierul trebuie să conțină o listă`);

    entries.forEach((entry, i) => {
      const parsed = wordSchema.safeParse(entry);
      if (parsed.success) words.push(parsed.data);
      else errors.push(...formatZodError(`${file}[${i}]`, parsed.error));
    });
  }

  const ids = new Set<string>();
  for (const w of words) {
    if (ids.has(w.id)) errors.push(`${w.id}: id duplicat`);
    ids.add(w.id);
    if (w.id.split("-").slice(1).join("-") !== w.it.replaceAll(" ", "_")) errors.push(`${w.id}: id-ul nu corespunde formei "${w.it}"`);
  }

  const forms = z.union([z.string(), z.array(z.string())]);
  const irregular: IrregularFile = z
    .object({
      presente: z.record(z.string(), z.array(z.string())),
      imperfetto: z.record(z.string(), z.array(z.string())).optional(),
      imperfettoStem: z.record(z.string(), z.string()).optional(),
      futuroStem: z.record(z.string(), z.string()).optional(),
      congiuntivo: z.record(z.string(), z.array(forms)).optional(),
      imperativo: z.record(z.string(), z.array(forms)).optional(),
      noImperativo: z.array(z.string()).optional(),
    })
    .strict()
    .parse(JSON.parse(readFileSync(IRREGULAR_FILE, "utf8")));

  const verbs = words.filter((w): w is ParsedVerb => w.pos === "verb");
  const built = buildConjugations(verbs, irregular);
  errors.push(...built.errors);

  const checked = conjugationsSchema.safeParse(built.conjugations);
  if (!checked.success) errors.push(...formatZodError("conjugations", checked.error));

  const sentences = loadSentences(words, errors);
  const { rankBasis, frequencySources, frequencyRanks } = assignRanks(words);
  assignLevels(words, frequencyRanks, errors);
  const topics = loadTopics(words as Word[], errors);

  return {
    rankBasis,
    frequencySources,
    words: words as Word[],
    conjugations: built.conjugations,
    sentences,
    topics,
    explicitPresenteCount: built.explicitCount,
    errors,
  };
}

/** Temele din content/topics/*.json, ordonate după grup și după numele fișierului. */
function loadTopics(words: Word[], errors: string[]): Topic[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const topics: Topic[] = [];
  const seen = new Set<string>();

  for (const file of readdirSync(TOPICS_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const parsed = topicSchema.safeParse(JSON.parse(readFileSync(resolve(TOPICS_DIR, file), "utf8")));
    if (!parsed.success) {
      errors.push(...formatZodError(file, parsed.error));
      continue;
    }
    const topic = parsed.data;
    if (seen.has(topic.id)) errors.push(`${file}: id de temă duplicat (${topic.id})`);
    seen.add(topic.id);

    const topicWordIds = new Set<string>();
    for (const sub of topic.subgroups) {
      for (const id of sub.wordIds) {
        const word = byId.get(id);
        if (!word) {
          errors.push(`${topic.id}: cuvântul ${id} nu există în dicționar`);
          continue;
        }
        topicWordIds.add(id);
        if (LEVELS.indexOf(word.level) > LEVELS.indexOf(topic.level)) {
          errors.push(`${topic.id}: ${id} are nivelul ${word.level}, mai mare decât al temei (${topic.level})`);
        }
      }
    }
    for (const id of topic.sequence ?? []) {
      if (!topicWordIds.has(id)) errors.push(`${topic.id}: ${id} din „sequence” nu face parte din subgrupele temei`);
    }
    if (topic.exercises.includes("order") && !topic.sequence) errors.push(`${topic.id}: exercițiul „order” cere „sequence”`);
    if ((topic.exercises.includes("numbers") || topic.exercises.includes("clock")) && !topic.skill) {
      errors.push(`${topic.id}: exercițiile „numbers” și „clock” cer „skill”`);
    }
    topics.push(topic);
  }
  // grupurile în ordinea din listă; în grup, ordinea fișierelor
  return topics
    .map((t, i) => ({ t, i }))
    .sort((a, b) => TOPIC_GROUPS.indexOf(a.t.group) - TOPIC_GROUPS.indexOf(b.t.group) || a.i - b.i)
    .map(({ t }) => t);
}

interface SentenceSource {
  id: string;
  wordIds: string[];
  it: string;
  ro: string;
  variants?: string[];
}

function buildSentence(source: SentenceSource, wordIds: ReadonlySet<string>, errors: string[]): Sentence | undefined {
  const { tokens, punctuation } = tokenizeSentence(source.it);
  if (tokens.length < MIN_TOKENS) return undefined;

  for (const id of source.wordIds) {
    if (!wordIds.has(id)) errors.push(`${source.id}: cuvântul ${id} nu există în dicționar`);
  }
  const { orders, errors: orderErrors } = acceptedOrders(source.it, source.variants ?? []);
  errors.push(...orderErrors.map((e) => `${source.id}: ${e}`));

  return { id: source.id, wordIds: source.wordIds, it: source.it, ro: source.ro, tokens, punctuation, acceptedOrders: orders };
}

/**
 * Propozițiile pentru Reconstruire: exemplele fiecărui cuvânt (o singură ordine acceptată)
 * plus propoziții scrise manual în content/sentences/, cu variante de ordine.
 */
function loadSentences(words: ParsedWord[], errors: string[]): Sentence[] {
  const wordIds = new Set(words.map((w) => w.id));
  const sentences: Sentence[] = [];

  for (const word of words) {
    word.examples.forEach((example, i) => {
      const sentence = buildSentence({ id: `s-${word.id}-${i}`, wordIds: [word.id], ...example }, wordIds, errors);
      if (sentence) sentences.push(sentence);
    });
  }

  for (const file of readdirSync(SENTENCES_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const raw: unknown = JSON.parse(readFileSync(resolve(SENTENCES_DIR, file), "utf8"));
    const sources = z
      .array(
        z
          .object({
            id: z.string(),
            wordIds: z.array(z.string()).min(1),
            it: z.string().min(1),
            ro: z.string().min(1),
            variants: z.array(z.string()).optional(),
          })
          .strict(),
      )
      .safeParse(raw);
    if (!sources.success) {
      errors.push(...formatZodError(file, sources.error));
      continue;
    }
    for (const source of sources.data) {
      const sentence = buildSentence(source, wordIds, errors);
      if (!sentence) errors.push(`${source.id}: propoziția are prea puține cuvinte pentru exercițiu`);
      else sentences.push(sentence);
    }
  }

  const ids = new Set<string>();
  for (const s of sentences) {
    if (ids.has(s.id)) errors.push(`${s.id}: id de propoziție duplicat`);
    ids.add(s.id);
  }
  const checked = sentencesSchema.safeParse(sentences);
  if (!checked.success) errors.push(...formatZodError("sentences", checked.error));
  return sentences;
}

/** Ordinea categoriilor la același rang de frecvență (ex. „ora” substantiv și adverb). */
const POS_ORDER = ["pronoun", "preposition", "conjunction", "adverb", "numeral", "adjective", "noun", "verb", "interjection", "expression"];

/**
 * Rangul unui cuvânt este poziția lui între cuvintele din dicționar, în ordinea frecvenței lemei.
 * Cuvintele care lipsesc din listele de frecvență vin la sfârșit, în ordinea rangului din fișier.
 * Rezultatul este mereu o numerotare 1..N fără duplicate; sortează lista pe loc.
 */
function assignRanks(words: ParsedWord[]): {
  rankBasis: "provisional" | "frequency-lists";
  frequencySources: string[];
  /** Rangul lemei în lista de frecvență (1 = cea mai frecventă), pentru calculul nivelurilor. */
  frequencyRanks: Map<string, number>;
} {
  const { ranks, sources } = loadFrequency();
  const freq = (w: ParsedWord) => ranks.get(lemmaOf(w)) ?? Number.POSITIVE_INFINITY;
  words.sort(
    (a, b) =>
      freq(a) - freq(b) ||
      a.rank - b.rank ||
      POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos),
  );
  words.forEach((word, i) => {
    word.rank = i + 1;
  });
  const allMatched = words.every((w) => ranks.has(lemmaOf(w)));
  return { rankBasis: allMatched ? "frequency-lists" : "provisional", frequencySources: sources, frequencyRanks: ranks };
}

interface LevelsConfig {
  bands: Partial<Record<Level, number>>;
  overrides: Record<string, Level>;
}

/**
 * Nivelul CEFR (estimat) al fiecărui cuvânt: un override din content/levels.json, altfel banda în care cade
 * rangul lemei în lista de frecvență. Un cuvânt fără rang de frecvență și fără override este o eroare.
 */
function assignLevels(words: ParsedWord[], frequencyRanks: Map<string, number>, errors: string[]): void {
  const config = z
    .object({
      bands: z.partialRecord(z.enum(LEVELS), z.number().int().positive()),
      overrides: z.record(z.string(), z.enum(LEVELS)),
    })
    .passthrough()
    .parse(JSON.parse(readFileSync(resolve(ROOT, "content/levels.json"), "utf8"))) as LevelsConfig;

  const ids = new Set(words.map((w) => w.id));
  for (const id of Object.keys(config.overrides)) {
    if (!ids.has(id)) errors.push(`levels.json: override pentru un cuvânt care nu există (${id})`);
  }

  for (const word of words) {
    const override = config.overrides[word.id];
    if (override) {
      word.level = override;
      continue;
    }
    const rank = frequencyRanks.get(lemmaOf(word));
    if (rank === undefined) {
      errors.push(`${word.id}: nu are rang de frecvență; adaugă un nivel în content/levels.json (overrides)`);
      word.level = "B2";
      continue;
    }
    word.level = levelForRank(rank, config.bands);
  }
}

/**
 * Nivelul unui rang de frecvență: prima bandă al cărei prag îl acoperă; dincolo de ultima bandă definită,
 * rangul rămâne la ultimul nivel definit (lista de frecvență are doar primele 3000 de leme).
 */
export function levelForRank(rank: number, bands: Partial<Record<Level, number>>): Level {
  const defined = LEVELS.filter((level) => bands[level] !== undefined);
  return defined.find((level) => rank <= bands[level]!) ?? defined.at(-1) ?? "B2";
}
