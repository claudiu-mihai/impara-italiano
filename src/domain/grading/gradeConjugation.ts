import { Rating, type Grade } from "ts-fsrs";
import type { AnswerResult } from "./compareAnswer.ts";

/** Răspuns aproape corect: doar accent sau o greșeală mică de scriere; se numără ca bun, dar limitează nota la Greu. */
const isSlip = (result: AnswerResult) => result === "almost" || result === "typo";

/** Câte persoane se cer la o repetiție de conjugare. */
export const PERSONS_PER_REVIEW = 3;

/**
 * Nota FSRS dintr-o repetiție de conjugare (3 persoane):
 * 3/3 → Bine, 2/3 → Greu, ≤1/3 → Din nou.
 * O greșeală doar de accent sau de scriere se numără ca răspuns corect, dar limitează nota la Greu.
 */
export function gradeConjugation(results: readonly AnswerResult[]): Grade {
  const right = results.filter((r) => r !== "wrong").length;
  const missed = results.length - right;
  if (missed >= 2) return Rating.Again;
  if (missed === 1) return Rating.Hard;
  return results.some(isSlip) ? Rating.Hard : Rating.Good;
}

/**
 * Nota variantei „Tabel” (toate persoanele deodată): toate corecte → Bine, cel puțin două treimi → Greu,
 * mai puțin → Din nou. O greșeală doar de accent sau de scriere se numără ca răspuns corect, dar limitează nota la Greu.
 */
export function gradeConjugationTable(results: readonly AnswerResult[]): Grade {
  const right = results.filter((r) => r !== "wrong").length;
  if (right === results.length) return results.some(isSlip) ? Rating.Hard : Rating.Good;
  return right / results.length >= 2 / 3 ? Rating.Hard : Rating.Again;
}
