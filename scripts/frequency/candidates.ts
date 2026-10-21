import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { readLexicon } from "./lexicon.ts";

// Listează lemele frecvente care nu sunt încă în dicționar, cu categoria și sensul din Wiktionary.
// Rulare: node scripts/frequency/candidates.ts [de_la_rang] [până_la_rang] [--missing]

const from = Number(process.argv[2] ?? 1);
const to = Number(process.argv[3] ?? 300);
const onlyMissing = process.argv.includes("--missing");

const { lemmas } = JSON.parse(readFileSync(resolve(ROOT, "content/frequency/it-lemmas.json"), "utf8")) as {
  lemmas: { lemma: string; rank: number }[];
};
const lexicon = readLexicon();
const have = new Set(loadContent().words.map((w) => w.it));

const POS_SHORT: Record<string, string> = {
  verb: "V", noun: "N", adj: "A", adv: "ADV", pron: "PRON", prep: "PREP", conj: "CONJ", num: "NUM",
  det: "DET", article: "ART", intj: "INTJ", name: "NAME", prefix: "pref", suffix: "suf", phrase: "PHR",
  particle: "PART", contraction: "CONTR", character: "CHR", symbol: "SYM", prep_phrase: "PREPPHR",
};

for (const { lemma, rank } of lemmas.filter((l) => l.rank >= from && l.rank <= to && !(onlyMissing && have.has(l.lemma)))) {
  const entries = lexicon[lemma] ?? [];
  const tag = have.has(lemma) ? "✔ " : "  ";
  const parts = entries
    .filter((e) => !e.formOf)
    .map((e) => `${POS_SHORT[e.pos] ?? e.pos}${e.headArgs["1"] && ["noun"].includes(e.pos) ? `(${e.headArgs["1"]})` : ""}: ${e.glosses[0] ?? "?"}`);
  const forms = entries.filter((e) => e.formOf).length ? " [formă flexionată]" : "";
  console.log(`${String(rank).padStart(4)} ${tag}${lemma.padEnd(14)} ${parts.slice(0, 3).join(" | ") || "(fără lemă în Wiktionary)"}${forms}`);
}
