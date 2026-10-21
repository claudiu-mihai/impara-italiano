import { normalize, stripAccents } from "./normalize.ts";

/** correct = identic; almost = diferă doar prin accente; wrong = altceva. */
export type AnswerResult = "correct" | "almost" | "wrong";

export function compareAnswer(input: string, accepted: readonly string[]): AnswerResult {
  const given = normalize(input);
  if (!given) return "wrong";

  const candidates = accepted.map(normalize);
  if (candidates.includes(given)) return "correct";

  const bare = stripAccents(given);
  if (candidates.some((candidate) => stripAccents(candidate) === bare)) return "almost";
  return "wrong";
}
