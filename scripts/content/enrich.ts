import { isReflexiveInfinitive, reflexiveBase } from "../../src/domain/content/reflexive.ts";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Level } from "../../src/domain/content/constants.ts";
import { ID_PREFIX } from "../../src/domain/content/wordsCodec.ts";
import { wordSchema, type Word } from "../../src/domain/content/schema.ts";
import { buildConjugations } from "../conjugate/build.ts";
import { regularParticiple } from "../conjugate/rules.ts";
import { ROOT } from "../content.ts";
import { loadFrequency } from "../frequency/ranks.ts";
import { plainForm, readLexicon, type LexiconEntry } from "../frequency/lexicon.ts";
import {
  cellForms,
  TENSE_TAGS,
  wiktionaryAuxiliaries,
  wiktionaryParticiple,
} from "../frequency/wiktionary.ts";
import { definiteArticle, pluralArticle, regularPlural, type Gender } from "./nounRules.ts";

// Completează ciornele din content/drafts/*.json (doar traducere, exemple, note) cu datele gramaticale
// din Wiktionary și scrie cuvintele finale în content/words/.
// Rulare: node scripts/content/enrich.ts tranche-02

interface Draft {
  it: string;
  pos: Word["pos"];
  ro: string;
  tags?: string[];
  examples: { it: string; ro: string }[];
  note?: string;
  falseFriend?: string;
  /** Plural dat explicit, când Wiktionary nu-l listează sau cel uzual diferă (braccio → braccia). */
  plural?: string;
  /** Genul pluralului, dacă diferă de al singularului (le braccia). */
  pluralGender?: Gender;
  /** Substantiv fără plural uzual (frutta, fame, luni); implicit se ia din Wiktionary („uncountable”). */
  uncountable?: boolean;
  /** Când Wiktionary are mai multe intrări pentru același cuvânt: text căutat în sensul (în engleză), ex. „rice”. */
  senseHint?: string;
  /** Substantive „mf” (agente, presidente): genul ales pentru articol. */
  gender?: Gender;
  /** Adjective: [ms, fs, mp, fp] dacă diferă de regulă sau sunt invariabile. */
  forms?: [string, string, string, string];
  /** Nivel CEFR dacă diferă de cel dat de frecvență; se trece în content/levels.json (overrides). */
  level?: Level;
  /** Categoria nu poate fi verificată în Wiktionary (ex. expresii ca „auguri”); se acceptă fără verificare. */
  unverifiedPos?: boolean;
  /** Verbe cu două auxiliare acceptate. */
  auxiliary?: "avere" | "essere" | "both";
}

/** Wiktionary clasifică posesivele și demonstrativele (mio, questo) ca „det”, iar sì / no ca „particle”. */
const KAIKKI_POS: Record<Word["pos"], string[]> = {
  verb: ["verb"], noun: ["noun"], adjective: ["adj", "det"], adverb: ["adv"], pronoun: ["pron", "det"],
  preposition: ["prep"], conjunction: ["conj"], numeral: ["num"], interjection: ["intj", "particle"],
  // expresiile din mai multe cuvinte sunt „phrase” în Wiktionary (sau lipsesc, atunci se folosește unverifiedPos)
  expression: ["phrase", "prep_phrase", "adv_phrase", "proverb", "intj", "adv"],
};
// prefixele id-urilor sunt în domain/content/wordsCodec.ts (aceleași se folosesc în aplicație)
/** Id-ul unei expresii nu are spații: „che ore sono” → e-che_ore_sono. */
const slug = (it: string) => it.replaceAll(" ", "_");

const name = process.argv[2];
if (!name) {
  console.error("Folosire: node scripts/content/enrich.ts <nume-tranșă>   (citește content/drafts/<nume>.json)");
  process.exit(1);
}
const draftFile = resolve(ROOT, `content/drafts/${name}.json`);
const outFile = resolve(ROOT, `content/words/${name}.json`);
if (!existsSync(draftFile)) {
  console.error(`Lipsește ${draftFile}`);
  process.exit(1);
}

const drafts: Draft[] = JSON.parse(readFileSync(draftFile, "utf8"));
const lexicon = readLexicon();
const frequency = loadFrequency();
const errors: string[] = [];
const notes: string[] = [];

const existingIds = new Set<string>();
for (const file of readdirSync(resolve(ROOT, "content/words")).filter((f) => f.startsWith("tranche-") && f !== `${name}.json`)) {
  for (const w of JSON.parse(readFileSync(resolve(ROOT, "content/words", file), "utf8")) as { id: string }[]) existingIds.add(w.id);
}

// Verbele reflexive (svegliarsi) se verifică în Wiktionary după verbul de bază (svegliare).
const reflexiveDraft = (draft: Draft) => draft.pos === "verb" && isReflexiveInfinitive(draft.it);
const lemmaKey = (draft: Draft) => (reflexiveDraft(draft) ? reflexiveBase(draft.it) : draft.it);

const pickEntry = (draft: Draft): LexiconEntry | undefined => {
  const entries = (lexicon[lemmaKey(draft)] ?? []).filter((e) => KAIKKI_POS[draft.pos].includes(e.pos));
  if (draft.senseHint) {
    const hint = draft.senseHint.toLowerCase();
    const matching = entries.filter((e) => e.glosses.some((g) => g.toLowerCase().includes(hint)));
    if (matching.length === 0) errors.push(`${draft.it}: niciun sens din Wiktionary nu conține „${draft.senseHint}”`);
    return matching.find((e) => !e.formOf) ?? matching[0];
  }
  return entries.find((e) => !e.formOf) ?? entries[0];
};

function noun(draft: Draft, entry: LexiconEntry | undefined) {
  const arg = entry?.headArgs["1"];
  const gender: Gender | undefined = draft.gender ?? (arg === "m" || arg === "f" ? arg : undefined);
  if (!gender) {
    errors.push(`${draft.it}: gen necunoscut (Wiktionary: „${arg ?? "—"}”); adaugă „gender” în ciornă`);
    return {};
  }
  const pluralForms = (entry?.forms ?? []).filter((f) => f.tags.includes("plural") && f.tags.every((t) => ["plural", "masculine", "feminine"].includes(t)));
  const invariable = /invariable|uncountable/.test(entry?.expansion ?? "") && pluralForms.length === 0;
  const plural =
    draft.plural ?? (pluralForms[0] ? plainForm(pluralForms[0].form) : invariable ? draft.it : regularPlural(draft.it, gender));
  if (!draft.plural && !pluralForms[0] && !invariable) notes.push(`${draft.it}: pluralul „${plural}” este calculat după regulă (Wiktionary nu îl listează)`);
  const pluralGender: Gender =
    draft.pluralGender ?? (pluralForms[0]?.tags.includes("feminine") ? "f" : pluralForms[0]?.tags.includes("masculine") ? "m" : gender);
  const uncountable = draft.uncountable ?? /uncountable/.test(entry?.expansion ?? "");
  return {
    gender,
    article: definiteArticle(draft.it, gender),
    plural,
    pluralArticle: pluralArticle(plural, gender, pluralGender),
    irregularPlural: plural !== regularPlural(draft.it, gender),
    ...(uncountable ? { uncountable: true } : {}),
  };
}

function adjective(draft: Draft, entry: LexiconEntry | undefined) {
  const word = draft.it;
  const stem = word.slice(0, -1);
  const rule: [string, string, string, string] = word.endsWith("o")
    ? [word, `${stem}a`, /io$/.test(word) ? stem : `${stem}i`, `${stem}e`] // serio → seri (nu „serii”)
    : word.endsWith("e")
      ? [word, word, `${word.slice(0, -1)}i`, `${word.slice(0, -1)}i`]
      : [word, word, word, word];
  const [ms, fs, mp, fp] = draft.forms ?? rule;
  const known = new Set((entry?.forms ?? []).map((f) => plainForm(f.form)));
  known.add(word);
  // unele intrări au pluralul doar în antet („grande m or f by sense (plural grandi)”), nu în lista de forme
  for (const token of (entry?.expansion ?? "").match(/[\p{L}']+/gu) ?? []) known.add(plainForm(token));
  const noForms = (entry?.forms ?? []).some((f) => f.form === "no-table-tags") && known.size <= 1;
  if (!noForms && entry && !draft.forms) {
    for (const form of [ms, fs, mp, fp]) {
      if (!known.has(form)) errors.push(`${draft.it}: forma „${form}” nu apare în Wiktionary; pune „forms” în ciornă`);
    }
  }
  return { forms: { ms, fs, mp, fp } };
}

function verb(draft: Draft, entry: LexiconEntry | undefined) {
  const reflexive = reflexiveDraft(draft);
  const infinitive = lemmaKey(draft);
  const group = infinitive.slice(-3) as "are" | "ere" | "ire";
  if (!["are", "ere", "ire"].includes(group)) {
    errors.push(`${draft.it}: nu se termină în -are/-ere/-ire`);
    return {};
  }
  const third = entry ? cellForms(entry, "presente", 2).standard[0] : undefined;
  const isc = group === "ire" && !!third && third.endsWith("isce");
  const participle = entry ? wiktionaryParticiple(entry) : undefined;
  const auxes = entry ? wiktionaryAuxiliaries(entry) : [];
  // reflexivele formează passato prossimo mereu cu essere (mi sono svegliato)
  const auxiliary = reflexive ? "essere" : draft.auxiliary ?? (auxes[0] as "avere" | "essere" | undefined) ?? "avere";
  if (auxes.length > 1 && !draft.auxiliary && !reflexive) notes.push(`${draft.it}: Wiktionary listează auxiliarele ${auxes.join(" / ")}; am ales „${auxiliary}”`);
  if (!participle) errors.push(`${draft.it}: participiul lipsește din Wiktionary`);

  const verbGroup = isc ? "isc" : group;
  // „neregulat” = participiu neregulat sau o formă din cele 5 timpuri care diferă de reguli
  const candidate = {
    id: `v-${draft.it}`, it: infinitive, group: verbGroup, auxiliary, pastParticiple: participle ?? "", irregular: false, reflexive: false,
  } as never;
  let irregular = participle !== undefined && participle !== regularParticiple(infinitive, verbGroup);
  if (entry && !irregular) {
    const generated = buildConjugations([candidate], { presente: {} }).conjugations[`v-${draft.it}`]!;
    for (const tense of Object.keys(TENSE_TAGS)) {
      for (let i = 0; i < 6 && !irregular; i++) {
        const { standard, all } = cellForms(entry, tense, i);
        const ours = (generated[tense as keyof typeof generated] ?? [])[i] ?? [];
        if (ours.some((f) => !all.has(f)) || (standard.length > 0 && !standard.some((s) => ours.includes(s)))) irregular = true;
      }
    }
  }
  return { group: verbGroup, auxiliary, pastParticiple: participle ?? "", irregular, reflexive };
}

const out: ReturnType<typeof wordSchema.parse>[] = [];
for (const draft of drafts) {
  const entry = pickEntry(draft);
  if (!entry && draft.unverifiedPos) {
    notes.push(`${draft.it}: categoria „${draft.pos}” nu a putut fi verificată în Wiktionary (acceptată explicit)`);
  } else if (!entry) {
    errors.push(`${draft.it}: Wiktionary nu are acest cuvânt ca „${KAIKKI_POS[draft.pos].join("/")}”`);
  } else if (entry.formOf) {
    notes.push(`${draft.it}: în Wiktionary pare o formă flexionată, nu o lemă; verifică`);
  }
  const id = `${ID_PREFIX[draft.pos]}-${slug(draft.it)}`;
  if (existingIds.has(id) || out.some((w) => w.id === id)) errors.push(`${id}: id duplicat`);

  const base = {
    id,
    it: draft.it,
    ro: draft.ro,
    pos: draft.pos,
    tags: draft.tags ?? [],
    rank: frequency.ranks.get(lemmaKey(draft)) ?? 9999,
    examples: draft.examples,
    ...(draft.falseFriend ? { falseFriend: draft.falseFriend } : {}),
    ...(draft.note ? { note: draft.note } : {}),
  };
  const extra = draft.pos === "noun" ? noun(draft, entry) : draft.pos === "adjective" ? adjective(draft, entry) : draft.pos === "verb" ? verb(draft, entry) : {};
  const parsed = wordSchema.safeParse({ ...base, ...extra });
  if (parsed.success) out.push(parsed.data);
  else errors.push(...parsed.error.issues.map((i) => `${draft.it}: ${i.path.join(".")}: ${i.message}`));
}

for (const n of notes) console.log(`  ℹ ${n}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} probleme:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`);

// Nivelurile cerute în ciornă merg în content/levels.json (overrides), sortate după id.
const levelsFile = resolve(ROOT, "content/levels.json");
const levelsConfig = JSON.parse(readFileSync(levelsFile, "utf8")) as { overrides: Record<string, Level> };
let levelChanges = 0;
for (const draft of drafts) {
  const id = `${ID_PREFIX[draft.pos]}-${slug(draft.it)}`;
  if (draft.level && levelsConfig.overrides[id] !== draft.level) {
    levelsConfig.overrides[id] = draft.level;
    levelChanges++;
  }
}
if (levelChanges > 0) {
  levelsConfig.overrides = Object.fromEntries(Object.entries(levelsConfig.overrides).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(levelsFile, `${JSON.stringify(levelsConfig, null, 2)}\n`);
  console.log(`  Niveluri actualizate în content/levels.json: ${levelChanges}`);
}
console.log(`Scris ${out.length} cuvinte în ${outFile}`);
