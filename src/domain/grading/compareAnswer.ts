import { normalize, stripAccents } from "./normalize.ts";

/** correct = identic; almost = diferă doar prin accente; typo = o literă greșită, lipsă, în plus sau inversată; wrong = altceva. */
export type AnswerResult = "correct" | "almost" | "typo" | "wrong";

/** Sub această lungime o literă schimbată dă altă formă (ho / hi, sei / sia), deci nu se iartă. */
export const MIN_TYPO_LENGTH = 4;

export interface CompareOptions {
  /** Iartă o singură greșeală de scriere (nota rămâne limitată la Greu). */
  typoTolerance?: boolean;
  /** Alte forme valide (ex. celelalte persoane ale verbului): dacă răspunsul e una dintre ele, nu se iartă. */
  exclude?: readonly string[];
}

/** True dacă șirurile diferă printr-o singură inserare, ștergere, înlocuire sau inversare de litere vecine. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const restA = a.slice(i);
  const restB = b.slice(i);
  if (restA.length === restB.length) {
    return restA.slice(1) === restB.slice(1) || (restA.length >= 2 && restA[0] === restB[1] && restA[1] === restB[0] && restA.slice(2) === restB.slice(2));
  }
  return restA.length > restB.length ? restA.slice(1) === restB : restB.slice(1) === restA;
}

export function compareAnswer(input: string, accepted: readonly string[], options: CompareOptions = {}): AnswerResult {
  const given = normalize(input);
  if (!given) return "wrong";

  const candidates = accepted.map(normalize);
  if (candidates.includes(given)) return "correct";

  const bare = stripAccents(given);
  if (candidates.some((candidate) => stripAccents(candidate) === bare)) return "almost";

  if (options.typoTolerance) {
    const otherForms = (options.exclude ?? []).map((form) => stripAccents(normalize(form)));
    const isOtherForm = otherForms.includes(bare) && !candidates.some((c) => stripAccents(c) === bare);
    if (!isOtherForm && candidates.some((c) => c.length >= MIN_TYPO_LENGTH && withinOneEdit(bare, stripAccents(c)))) return "typo";
  }
  return "wrong";
}
