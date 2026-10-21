import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { encodeWords } from "../src/domain/content/wordsCodec.ts";
import { metaSchema, type ContentMeta } from "../src/domain/content/schema.ts";
import { loadContent, ROOT } from "./content.ts";

const OUT_DIR = resolve(ROOT, "src/data/generated");

const SOURCES = [
  {
    name: "FrequencyWords (OpenSubtitles 2018)",
    url: "https://github.com/hermitdave/FrequencyWords",
    license: "CC BY-SA 4.0",
    role: "frecvența în italiana vorbită (subtitrări)",
  },
  {
    name: "Leipzig Corpora Collection (știri italiene, 2023)",
    url: "https://wortschatz.uni-leipzig.de/en/download/ita",
    license: "CC BY 4.0",
    role: "frecvența în italiana scrisă",
  },
  {
    name: "Wiktionary, prin kaikki.org",
    url: "https://kaikki.org/dictionary/Italian/",
    license: "CC BY-SA 4.0",
    role: "gen, plural, forme și verificarea conjugărilor",
  },
];

const { words, conjugations, sentences, topics, grammar, rankBasis, explicitPresenteCount, errors } = loadContent();

if (errors.length > 0) {
  console.error(`Conținut invalid: ${errors.length} erori`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

// Un element pe linie, ca diferențele să rămână lizibile.
const lines = (items: unknown[]) => `[\n${items.map((item) => `  ${JSON.stringify(item)}`).join(",\n")}\n]\n`;

// words.json: doar ce trebuie ecranului de start, listelor, căutării și quiz-ului (se încarcă la pornire);
// details.json: cuvintele complete, cu exemple, note și forme (se încarcă doar unde se afișează).
const coreOf = (w: (typeof words)[number]) => ({
  id: w.id,
  it: w.it,
  ro: w.ro,
  pos: w.pos,
  rank: w.rank,
  level: w.level,
  ...(w.pos === "noun" ? { article: w.article } : {}),
});
// words.json în format compact (vezi wordsCodec.ts), un cuvânt pe linie
const wordsJson = `{"w":[\n${encodeWords(words.map(coreOf)).w.map((w) => `  ${JSON.stringify(w)}`).join(",\n")}\n]}\n`;
const detailsJson = lines(words);
const conjugationsJson = `{\n${Object.entries(conjugations)
  .map(([id, forms]) => `  ${JSON.stringify(id)}: ${JSON.stringify(forms)}`)
  .join(",\n")}\n}\n`;

const sentencesJson = `[\n${sentences.map((s) => `  ${JSON.stringify(s)}`).join(",\n")}\n]\n`;

const topicsJson = `${JSON.stringify(topics, null, 1)}\n`;
const grammarJson = `${JSON.stringify(grammar, null, 1)}\n`;

const dataVersion = createHash("sha256")
  .update(wordsJson)
  .update(detailsJson)
  .update(conjugationsJson)
  .update(sentencesJson)
  .update(topicsJson)
  .update(grammarJson)
  .digest("hex")
  .slice(0, 12);

const meta: ContentMeta = metaSchema.parse({
  dataVersion,
  generatedAt: new Date().toISOString().slice(0, 10),
  rankBasis,
  wordCount: words.length,
  // Sursele apar în aplicație doar dacă rangurile chiar provin din ele.
  sources: rankBasis === "frequency-lists" ? SOURCES : [],
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, "words.json"), wordsJson);
writeFileSync(resolve(OUT_DIR, "details.json"), detailsJson);
writeFileSync(resolve(OUT_DIR, "conjugations.json"), conjugationsJson);
writeFileSync(resolve(OUT_DIR, "sentences.json"), sentencesJson);
writeFileSync(resolve(OUT_DIR, "topics.json"), topicsJson);
writeFileSync(resolve(OUT_DIR, "grammar.json"), grammarJson);
writeFileSync(resolve(OUT_DIR, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

console.log(
  `Date generate: ${words.length} cuvinte, ${Object.keys(conjugations).length} verbe conjugate, ${sentences.length} propoziții, ${topics.length} teme, ${grammar.length} teme de gramatică ` +
    `(${explicitPresenteCount} presente din irregular.json), versiune ${dataVersion} → ${OUT_DIR}`,
);
