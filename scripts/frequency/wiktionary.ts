import { plainForm, type LexiconEntry } from "./lexicon.ts";

/** Persoanele în ordinea din datele de conjugare: io, tu, lui/lei, noi, voi, loro. */
export const PERSON_TAGS: [string, string][] = [
  ["first-person", "singular"],
  ["second-person", "singular"],
  ["third-person", "singular"],
  ["first-person", "plural"],
  ["second-person", "plural"],
  ["third-person", "plural"],
];

/** Imperativul afirmativ: tu, Lei, noi, voi, Loro. Formele negative au eticheta „negative” și sunt excluse. */
export const IMPERATIVE_TAGS: string[][] = [
  ["imperative", "second-person", "singular"],
  ["imperative", "formal", "second-person-semantically", "singular", "third-person"],
  ["imperative", "first-person", "plural"],
  ["imperative", "plural", "second-person"],
  ["imperative", "formal", "plural", "second-person-semantically", "third-person"],
];

/** Etichetele care definesc o celulă (timp + persoană). */
export function cellTags(tense: string, person: number): string[] {
  return tense === "imperativo" ? IMPERATIVE_TAGS[person]! : [...TENSE_TAGS[tense]!, ...PERSON_TAGS[person]!];
}

/** Timpurile verificate și etichetele Wiktionary care le definesc. */
export const TENSE_TAGS: Record<string, string[]> = {
  presente: ["indicative", "present"],
  imperfetto: ["imperfect", "indicative"],
  futuro: ["future", "indicative"],
  condizionale: ["conditional"],
  congiuntivo: ["present", "subjunctive"],
};

/** Câte persoane are fiecare timp. */
export const personCount = (tense: string) => (tense === "imperativo" ? 5 : 6);

/** Monosilabele au în Wiktionary accent de intensitate (hò, và, dò) pe care ortografia nu-l are. */
export function formVariants(form: string): string[] {
  const plain = plainForm(form);
  const stripped = /^[a-z]{1,3}[àèéìòù]$/.test(plain) ? [plain.normalize("NFD").replace(/\p{Diacritic}/gu, "")] : [];
  return [plain, ...stripped];
}

export interface CellForms {
  /** Toate formele din Wiktionary pentru celulă, inclusiv arhaice sau dialectale. */
  all: Set<string>;
  /** Formele curente: fără alte etichete decât cele care definesc celula. */
  standard: string[];
}

export function cellForms(entry: LexiconEntry, tense: string, person: number): CellForms {
  const tags = cellTags(tense, person);
  // Wiktionary marchează formele inexistente (verbe defective) cu „-”; nu sunt forme reale
  const matching = entry.forms.filter((f) => /\p{L}/u.test(f.form) && tags.every((t) => f.tags.includes(t)));
  const standard = matching
    .filter((f) => f.tags.every((t) => tags.includes(t)))
    .map((f) => formVariants(f.form).at(-1)!);
  return { all: new Set(matching.flatMap((f) => formVariants(f.form))), standard: [...new Set(standard)] };
}

export function wiktionaryParticiple(entry: LexiconEntry): string | undefined {
  const f = entry.forms.find((x) => x.tags.includes("participle") && x.tags.includes("past"));
  return f ? plainForm(f.form) : undefined;
}

export function wiktionaryAuxiliaries(entry: LexiconEntry): string[] {
  return [...new Set(entry.forms.filter((f) => f.tags.includes("auxiliary")).map((f) => plainForm(f.form)))];
}
