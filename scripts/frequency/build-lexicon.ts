import { isReflexiveInfinitive, reflexiveBase } from "../../src/domain/content/reflexive.ts";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { extractLexicon, KAIKKI_FILE, writeLexicon } from "./lexicon.ts";

// Extrage din kaikki.org datele lemelor frecvente și ale cuvintelor din dicționar.
// Rulare: node scripts/frequency/build-lexicon.ts   (după descărcarea kaikki-italian.jsonl)

if (!existsSync(KAIKKI_FILE)) {
  console.error(`Lipsește ${KAIKKI_FILE}.\nDescarcă: https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl`);
  process.exit(1);
}

const frequency = JSON.parse(readFileSync(resolve(ROOT, "content/frequency/it-lemmas.json"), "utf8")) as {
  lemmas: { lemma: string }[];
};
const targets = new Set(frequency.lemmas.map((l) => l.lemma));
for (const word of loadContent().words) targets.add(word.it);

// cuvintele din ciorne (content/drafts), chiar dacă nu sunt printre cele mai frecvente 3000 de leme
const draftsDir = resolve(ROOT, "content/drafts");
if (existsSync(draftsDir)) {
  for (const file of readdirSync(draftsDir).filter((f) => f.endsWith(".json"))) {
    for (const draft of JSON.parse(readFileSync(resolve(draftsDir, file), "utf8")) as { it: string }[]) {
      targets.add(draft.it);
      // verbele reflexive se verifică după verbul de bază (svegliarsi → svegliare)
      if (isReflexiveInfinitive(draft.it)) targets.add(reflexiveBase(draft.it));
    }
  }
}

console.log(`Caut ${targets.size} cuvinte în ${KAIKKI_FILE} …`);
const lexicon = await extractLexicon(targets);
writeLexicon(lexicon);
const missing = [...targets].filter((t) => !lexicon[t]);
console.log(`Găsite: ${Object.keys(lexicon).length}; lipsă: ${missing.length}`);
