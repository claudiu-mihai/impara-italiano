import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { ROOT } from "../content.ts";

/** Datele din Wiktionary (via kaikki.org) pentru un cuvânt, reduse la ce ne trebuie. */
export interface LexiconEntry {
  pos: string;
  /** Argumentele șablonului de început (it-noun, it-adj, it-verb): genul, pluralul etc. */
  headArgs: Record<string, string>;
  expansion: string;
  forms: { form: string; tags: string[] }[];
  glosses: string[];
  /** Adevărat dacă toate sensurile sunt „formă flexionată a…”, deci pagina nu este o lemă. */
  formOf: boolean;
}

export type Lexicon = Record<string, LexiconEntry[]>;

export const KAIKKI_FILE = resolve(ROOT, "content/sources/kaikki-italian.jsonl");
export const LEXICON_FILE = resolve(ROOT, "content/sources/it-lexicon.json");

const NOISE_TAGS = new Set(["table-tags", "inflection-template", "class"]);

/**
 * Wiktionary scrie accentul de intensitate în interiorul cuvântului (parlàre, pàrlo).
 * Accentul ortografic al limbii italiene apare doar pe ultima literă (città, perché, andrò).
 */
export function plainForm(form: string): string {
  return [...form.normalize("NFC")]
    .map((char, i, all) => (i < all.length - 1 ? char.normalize("NFD").replace(/\p{Diacritic}/gu, "") : char))
    .join("")
    .replace(/’/g, "'");
}

/** Citește dicționarul kaikki în flux și păstrează doar cuvintele cerute. */
export async function extractLexicon(targets: ReadonlySet<string>): Promise<Lexicon> {
  const lexicon: Lexicon = {};
  const lines = createInterface({ input: createReadStream(KAIKKI_FILE, { encoding: "utf8" }), crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line) continue;
    const raw = JSON.parse(line) as Record<string, any>;
    if (raw.lang_code !== "it" || !targets.has(raw.word)) continue;

    const senses: any[] = raw.senses ?? [];
    const head = (raw.head_templates ?? [])[0] ?? {};
    const entry: LexiconEntry = {
      pos: raw.pos,
      headArgs: head.args ?? {},
      expansion: head.expansion ?? "",
      forms: (raw.forms ?? [])
        .filter((f: any) => !(f.tags ?? []).some((t: string) => NOISE_TAGS.has(t)))
        .map((f: any) => ({ form: f.form, tags: f.tags ?? [] })),
      glosses: [...new Set(senses.flatMap((s) => s.glosses ?? []))].slice(0, 4),
      formOf: senses.length > 0 && senses.every((s) => (s.form_of ?? []).length > 0 || (s.alt_of ?? []).length > 0),
    };
    (lexicon[raw.word] ??= []).push(entry);
  }
  return lexicon;
}

export function readLexicon(): Lexicon {
  if (!existsSync(LEXICON_FILE)) {
    throw new Error("Lipsește content/sources/it-lexicon.json. Rulează: node scripts/frequency/build-lexicon.ts");
  }
  return JSON.parse(readFileSync(LEXICON_FILE, "utf8")) as Lexicon;
}

export function writeLexicon(lexicon: Lexicon): void {
  writeFileSync(LEXICON_FILE, JSON.stringify(lexicon));
}
