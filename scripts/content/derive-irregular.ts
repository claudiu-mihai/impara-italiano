import { lemmaOf, reflexiveBase } from "../../src/domain/content/reflexive.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Verb } from "../../src/domain/content/schema.ts";
import { buildConjugations, type IrregularFile } from "../conjugate/build.ts";
import { loadContent, ROOT } from "../content.ts";
import { readLexicon } from "../frequency/lexicon.ts";
import { cellForms, personCount } from "../frequency/wiktionary.ts";

// Completează content/verbs/irregular.json pentru verbele neregulate care nu au încă excepții scrise:
// compară formele generate din reguli cu Wiktionary și scrie doar ce diferă.
// Rulare: node scripts/content/derive-irregular.ts [--write]

const FILE = resolve(ROOT, "content/verbs/irregular.json");
const write = process.argv.includes("--write");

const irregular: Required<IrregularFile> = {
  imperfetto: {},
  imperfettoStem: {},
  futuroStem: {},
  congiuntivo: {},
  imperativo: {},
  noImperativo: [],
  ...JSON.parse(readFileSync(FILE, "utf8")),
};
const lexicon = readLexicon();
const verbs = loadContent().words.filter((w): w is Verb => w.pos === "verb");
const known = (id: string) =>
  id in irregular.presente || id in irregular.futuroStem || id in irregular.imperfettoStem || id in irregular.imperfetto || id in irregular.congiuntivo;

// verbele reflexive se derivă din verbul de bază; pronumele nu intră în excepții
const bare = (v: Verb): Verb => (v.reflexive ? { ...v, it: reflexiveBase(v.it), reflexive: false } : v);

const added: string[] = [];
const problems: string[] = [];

for (const verb of verbs.filter((v) => v.irregular && !known(v.id))) {
  const entry = lexicon[lemmaOf(verb)]?.find((e) => e.pos === "verb" && !e.formOf);
  if (!entry) {
    problems.push(`${verb.id}: nu există în Wiktionary`);
    continue;
  }
  const standard = (tense: string) => Array.from({ length: 6 }, (_, i) => cellForms(entry, tense, i).standard);
  const matches = (ours: string[][], tense: string) =>
    standard(tense).every((std, i) => std.length === 0 || std.some((s) => ours[i]?.includes(s)));
  const generated = (extra: Partial<IrregularFile> = {}) =>
    buildConjugations([bare(verb)], { presente: {}, ...extra }).conjugations[verb.id]!;

  // 1. presente
  const base = generated();
  if (!matches(base.presente!, "presente")) {
    const forms = standard("presente").map((s) => s[0]);
    if (forms.some((f) => !f)) problems.push(`${verb.id}: presente incomplet în Wiktionary`);
    else irregular.presente[verb.id] = forms as string[];
  }

  // 2. futuro / condizionale (aceeași temă)
  if (!matches(base.futuro!, "futuro") || !matches(base.condizionale!, "condizionale")) {
    // verbele defective (accadere) nu au persoana I: tema se deduce din persoana a III-a (accadrà)
    const first = standard("futuro")[0]?.[0] ?? standard("futuro")[2]?.[0];
    const stem = first?.endsWith("ò") || first?.endsWith("à") ? first.slice(0, -1) : undefined;
    if (!stem) problems.push(`${verb.id}: nu pot deduce tema de viitor`);
    else {
      const check = generated({ futuroStem: { [verb.id]: stem } });
      if (matches(check.futuro!, "futuro") && matches(check.condizionale!, "condizionale")) irregular.futuroStem[verb.id] = stem;
      else problems.push(`${verb.id}: tema „${stem}” nu regenerează viitorul/condiționalul din Wiktionary`);
    }
  }

  // 3. imperfetto
  if (!matches(base.imperfetto!, "imperfetto")) {
    const first = standard("imperfetto")[0]?.[0];
    const stem = first?.endsWith("vo") ? first.slice(0, -2) : undefined;
    const check = stem ? generated({ imperfettoStem: { [verb.id]: stem } }) : undefined;
    if (stem && check && matches(check.imperfetto!, "imperfetto")) irregular.imperfettoStem[verb.id] = stem;
    else irregular.imperfetto[verb.id] = standard("imperfetto").map((s) => s[0] ?? "");
  }

  // 4. congiuntivo
  if (!matches(base.congiuntivo!, "congiuntivo")) {
    irregular.congiuntivo[verb.id] = standard("congiuntivo").map((s) => (s.length > 1 ? s : (s[0] ?? "")));
  }
  // verbele cu doar participiu neregulat (prendere → preso) nu au nevoie de excepții în acest fișier
  if (known(verb.id)) added.push(verb.id);
}

// 5. imperativo (tu, Lei, noi, voi, Loro): verificat pentru toate verbele, nu doar pentru cele fără excepții
for (const verb of verbs) {
  if (verb.id in irregular.imperativo || irregular.noImperativo.includes(verb.id)) continue;
  const entry = lexicon[lemmaOf(verb)]?.find((e) => e.pos === "verb" && !e.formOf);
  if (!entry) continue;
  const standard = Array.from({ length: personCount("imperativo") }, (_, i) => cellForms(entry, "imperativo", i).standard);
  const ours = buildConjugations([bare(verb)], { presente: irregular.presente, imperfetto: irregular.imperfetto, imperfettoStem: irregular.imperfettoStem, futuroStem: irregular.futuroStem, congiuntivo: irregular.congiuntivo }).conjugations[verb.id]!.imperativo!;
  // „-” = Wiktionary nu are forma (verbe defective sau modale)
  const real = standard.map((s) => s.filter((f) => /\p{L}/u.test(f)));
  if (real.every((s) => s.length === 0)) {
    irregular.noImperativo.push(verb.id);
    added.push(verb.id);
  } else if (real.some((std, i) => std.length > 0 && !std.some((s) => ours[i]?.includes(s)))) {
    if (real.some((s) => s.length === 0)) problems.push(`${verb.id}: imperativ incomplet în Wiktionary`);
    else irregular.imperativo[verb.id] = real.map((s) => (s.length > 1 ? s : s[0]!));
    added.push(verb.id);
  }
}

const line = (value: unknown) => JSON.stringify(value);
const section = (name: string, entries: Record<string, unknown>) =>
  `  "${name}": {\n${Object.entries(entries)
    .map(([k, v]) => `    ${line(k)}: ${line(v)}`)
    .join(",\n")}\n  }`;
const body = `{\n${[
  section("presente", irregular.presente),
  section("imperfetto", irregular.imperfetto),
  section("imperfettoStem", irregular.imperfettoStem),
  section("futuroStem", irregular.futuroStem),
  section("congiuntivo", irregular.congiuntivo),
  section("imperativo", irregular.imperativo),
  `  "noImperativo": ${line(irregular.noImperativo)}`,
].join(",\n")}\n}\n`;

console.log(`Verbe neregulate procesate: ${added.length}${added.length ? ` (${added.join(", ")})` : ""}`);
for (const p of problems) console.log(`  ✗ ${p}`);
if (write && added.length > 0) {
  writeFileSync(FILE, body);
  console.log("irregular.json actualizat.");
} else if (added.length > 0) {
  console.log("Rulează cu --write ca să salvezi.");
}
