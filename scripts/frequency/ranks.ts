import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "../content.ts";

export interface FrequencyData {
  /** Rangul combinat al fiecărei leme (1 = cea mai frecventă). */
  ranks: Map<string, number>;
  sources: string[];
}

/** Rangurile lemelor din content/frequency/it-lemmas.json (produs de build_lemmas.py). */
export function loadFrequency(): FrequencyData {
  const file = JSON.parse(readFileSync(resolve(ROOT, "content/frequency/it-lemmas.json"), "utf8")) as {
    sources: string[];
    lemmas: { lemma: string; rank: number }[];
  };
  return { ranks: new Map(file.lemmas.map((l) => [l.lemma, l.rank])), sources: file.sources };
}
