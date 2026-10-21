import { lemmaOf } from "../../src/domain/content/reflexive.ts";
import { loadContent } from "../content.ts";
import { plainForm, readLexicon, type LexiconEntry } from "./lexicon.ts";
import { cellTags, personCount } from "./wiktionary.ts";

// Compară conjugările generate cu formele din Wiktionary (kaikki.org).
//   eroare   = o formă a noastră nu există în Wiktionary pentru acea celulă
//   avertisment = Wiktionary are o formă curentă (nu arhaică/rară) pe care nu o acceptăm
// Rulare: node scripts/frequency/verify-conjugations.ts

const TENSES_CHECKED = ["presente", "imperfetto", "futuro", "condizionale", "congiuntivo", "imperativo"];

/** Monosilabele au în Wiktionary accent de intensitate (hò, và, dò) pe care ortografia nu-l are. */
const variants = (form: string): string[] => {
  const plain = plainForm(form);
  const stripped = /^[a-z]{1,3}[àèéìòù]$/.test(plain) ? [plain.normalize("NFD").replace(/\p{Diacritic}/gu, "")] : [];
  return [plain, ...stripped];
};

/** Verbele reflexive se compară cu verbul de bază: pronumele (proclitic sau enclitic) se scoate din formă. */
function withoutPronoun(tense: string, person: number, form: string): string {
  if (tense !== "imperativo") return form.replace(/^(mi|ti|si|ci|vi) /, "");
  const suffix = ["ti", "", "ci", "vi", ""][person]!;
  return person === 1 || person === 4 ? form.replace(/^si /, "") : form.slice(0, form.length - suffix.length);
}

const { words, conjugations } = loadContent();
const lexicon = readLexicon();

const problems: string[] = [];
const warnings: string[] = [];
let cells = 0;

for (const word of words.filter((w) => w.pos === "verb")) {
  const entry: LexiconEntry | undefined = lexicon[lemmaOf(word)]?.find((e) => e.pos === "verb" && !e.formOf);
  if (!entry) {
    problems.push(`${word.id}: nu există în Wiktionary`);
    continue;
  }
  const mine = conjugations[word.id]!;

  for (const tense of TENSES_CHECKED) {
    for (let i = 0; i < personCount(tense); i++) {
      const tags = cellTags(tense, i);
      const cell = `${tense} #${i + 1}`;
      const matching = entry.forms.filter((f) => tags.every((t) => f.tags.includes(t)));
      const all = new Set(matching.flatMap((f) => variants(f.form)));
      // „curentă” = fără alte etichete decât cele cerute (nu arhaică, dialectală, rară etc.)
      const standard = new Set(
        matching.filter((f) => f.tags.every((t) => tags.includes(t))).flatMap((f) => variants(f.form)),
      );
      const ours = ((mine[tense as keyof typeof mine] ?? [])[i] ?? []).map((form) => (word.pos === "verb" && word.reflexive ? withoutPronoun(tense, i, form) : form));
      cells++;
      for (const form of ours) {
        // o formă arhaică, dialectală sau rară (cu etichete în Wiktionary) nu este una pe care s-o învățăm
        const accepted = standard.size > 0 ? standard.has(form) : all.has(form);
        if (!accepted) problems.push(`${word.id} ${cell}: „${form}” nu este o formă curentă în Wiktionary (curente: ${[...standard].join(", ") || "—"})`);
      }
      for (const form of standard) {
        if (!ours.some((o) => variants(o).includes(form) || o === form)) {
          warnings.push(`${word.id} ${cell}: Wiktionary are și „${form}”`);
        }
      }
    }
  }

  // participiu și auxiliar (pentru passato prossimo)
  const participle = entry.forms.find((f) => f.tags.includes("participle") && f.tags.includes("past"));
  if (participle && plainForm(participle.form) !== word.pastParticiple) {
    problems.push(`${word.id} participiu: „${word.pastParticiple}” ≠ Wiktionary „${plainForm(participle.form)}”`);
  }
  const aux = word.pos === "verb" && word.reflexive ? [] : [...new Set(entry.forms.filter((f) => f.tags.includes("auxiliary")).map((f) => plainForm(f.form)))];
  const expected = word.auxiliary === "both" ? ["avere", "essere"] : [word.auxiliary];
  if (aux.length > 0) {
    // eroare: auxiliarul nostru nu există deloc în Wiktionary; avertisment: Wiktionary mai listează unul rar
    const missing = expected.filter((a) => !aux.includes(a));
    if (missing.length > 0) problems.push(`${word.id} auxiliar: „${missing.join(", ")}” lipsește din Wiktionary (${aux.join(" / ")})`);
    else if (aux.some((a) => !expected.includes(a))) warnings.push(`${word.id} auxiliar: Wiktionary listează ${aux.join(" / ")}, noi: ${expected.join(" / ")}`);
  }
}

console.log(`Celule comparate: ${cells} (${words.filter((w) => w.pos === "verb").length} verbe × 6 timpuri), plus participiu și auxiliar.`);
console.log(`Erori: ${problems.length}; avertismente: ${warnings.length}`);
for (const p of problems) console.log(`  ✗ ${p}`);
if (process.argv.includes("--warnings")) for (const w of warnings) console.log(`  ! ${w}`);
process.exit(problems.length > 0 ? 1 : 0);
