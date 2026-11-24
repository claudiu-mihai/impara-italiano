import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { encodeWords } from "../src/domain/content/wordsCodec.ts";
import { metaSchema, type ContentMeta } from "../src/domain/content/schema.ts";
import { DIALOGUE_AUDIO_DIR, withDialogueAudio } from "./audio/dialogueAudio.ts";
import { FEED_AUDIO_DIR, feedAudioJobs, withFeedAudio } from "./audio/feedAudio.ts";
import { withStoryAudio } from "./audio/storyAudio.ts";
import { recordingsIndex, WORD_AUDIO_DIR } from "./audio/wordAudio.ts";
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

const { words, conjugations, romanian, sentences, topics, grammar, dialogues, stories, pack, rankBasis, explicitPresenteCount, presenteIrregular, errors } = loadContent();

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

// conjugationsRo.json: verbele cu conjugare activă și formele lor românești, un verb pe linie (mic, se încarcă cu conjugarea)
const conjugationsRoJson = `{\n${Object.entries(romanian)
  .map(([id, verb]) => `  ${JSON.stringify(id)}: ${JSON.stringify(verb)}`)
  .join(",\n")}\n}\n`;

const sentencesJson = `[\n${sentences.map((s) => `  ${JSON.stringify(s)}`).join(",\n")}\n]\n`;

const topicsJson = `${JSON.stringify(topics, null, 1)}\n`;
// ghid.json: doar ce trebuie ordinii cuvintelor noi (temele cu cuvintele lor, în ordinea fișei); mic, ca să nu încarce fișele întregi
const guideJson = lines(
  topics.map((t) => ({
    id: t.id,
    level: t.level,
    ...(t.path !== undefined ? { path: t.path } : {}),
    wordIds: [...new Set(t.subgroups.flatMap((s) => s.wordIds))],
  })),
);
const grammarJson = `${JSON.stringify(grammar, null, 1)}\n`;
// dialogues.json: un dialog pe linie, încărcat doar de ecranele cu dialoguri; replicile primesc fișierele audio generate
const audioDir = resolve(ROOT, DIALOGUE_AUDIO_DIR);
const dialoguesWithAudio = dialogues.map((d) => withDialogueAudio(d, (file) => existsSync(resolve(audioDir, file))));
const dialoguesJson = lines(dialoguesWithAudio);
const lineVariants = dialoguesWithAudio.flatMap((d) => d.lines).length * 2;
const audioVariants = dialoguesWithAudio.flatMap((d) => d.lines).reduce((n, l) => n + Object.keys(l.audio ?? {}).length, 0);
// stories.json: o poveste pe linie, încărcat doar de lista de dialoguri și de ecranul poveștii
const storiesWithAudio = stories.map((s) => withStoryAudio(s, (file) => existsSync(resolve(audioDir, file))));
const storiesJson = lines(storiesWithAudio);
const storyLines = storiesWithAudio.flatMap((s) => s.scenes.flatMap((scene) => scene.lines));
// feed.json: pachetul fluxului, un item pe linie, încărcat doar de ecranul Flux
const feedAudioDir = resolve(ROOT, FEED_AUDIO_DIR);
const packWithAudio = pack.map((item) => withFeedAudio(item, (file) => existsSync(resolve(feedAudioDir, file))));
const feedJson = lines(packWithAudio);
const feedTexts = feedAudioJobs(pack);
const feedAudioCount = feedTexts.filter((j) => existsSync(resolve(feedAudioDir, j.file))).length;
const presenteIrregularJson = lines(presenteIrregular);
// recordings.json: textul rostit → înregistrarea (cuvintele A1), încărcat de `speak()` după pornire
const wordAudioDir = resolve(ROOT, WORD_AUDIO_DIR);
const recordings = recordingsIndex(words, (file) => existsSync(resolve(wordAudioDir, file)));
const recordingsJson = `${JSON.stringify(recordings)}\n`;

const dataVersion = createHash("sha256")
  .update(wordsJson)
  .update(detailsJson)
  .update(conjugationsJson)
  .update(conjugationsRoJson)
  .update(sentencesJson)
  .update(topicsJson)
  .update(guideJson)
  .update(grammarJson)
  .update(dialoguesJson)
  .update(storiesJson)
  .update(feedJson)
  .update(presenteIrregularJson)
  .update(recordingsJson)
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
writeFileSync(resolve(OUT_DIR, "conjugationsRo.json"), conjugationsRoJson);
writeFileSync(resolve(OUT_DIR, "sentences.json"), sentencesJson);
writeFileSync(resolve(OUT_DIR, "topics.json"), topicsJson);
writeFileSync(resolve(OUT_DIR, "guide.json"), guideJson);
writeFileSync(resolve(OUT_DIR, "grammar.json"), grammarJson);
writeFileSync(resolve(OUT_DIR, "dialogues.json"), dialoguesJson);
writeFileSync(resolve(OUT_DIR, "stories.json"), storiesJson);
writeFileSync(resolve(OUT_DIR, "feed.json"), feedJson);
writeFileSync(resolve(OUT_DIR, "presenteIrregular.json"), presenteIrregularJson);
writeFileSync(resolve(OUT_DIR, "recordings.json"), recordingsJson);
writeFileSync(resolve(OUT_DIR, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);

console.log(
  `Date generate: ${words.length} cuvinte, ${Object.keys(conjugations).length} verbe conjugate (${Object.keys(romanian).length} cu conjugare activă), ${sentences.length} propoziții, ${topics.length} teme, ${grammar.length} teme de gramatică, ${dialogues.length} dialoguri (audio: ${audioVariants}/${lineVariants} replici), ${pack.length} itemi în flux (audio: ${feedAudioCount}/${feedTexts.length} texte), ${stories.length} povești (audio: ${storyLines.filter((l) => l.audio).length}/${storyLines.length} replici), ${Object.keys(recordings).length} cuvinte cu audio ` +
    `(${explicitPresenteCount} presente din irregular.json), versiune ${dataVersion} → ${OUT_DIR}`,
);
