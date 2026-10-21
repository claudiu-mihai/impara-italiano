import type { CoreWord } from "../content/types.ts";
import { answerText, italianText } from "../content/display.ts";
import { normalize } from "../grading/normalize.ts";
import { shuffle, type Random } from "../random.ts";

/** Câte perechi are o rundă „Potrivește perechi”. */
export const MATCH_PAIRS_PER_ROUND = 5;

export interface MatchPair {
  wordId: string;
  it: string;
  ro: string;
}

/**
 * Rundele pentru „Potrivește perechi”: toate cuvintele temei, în grupuri de câte 5.
 * Cuvintele cu aceeași traducere nu apar în aceeași rundă (ar fi ambigue); ultima rundă se completează
 * cu cuvinte din rundele anterioare ca să aibă tot 5 perechi (sau toate cuvintele, dacă sunt mai puține).
 */
export function buildMatchRounds(words: readonly CoreWord[], random: Random = Math.random): MatchPair[][] {
  const pairs = shuffle(
    words.map((w): MatchPair => ({ wordId: w.id, it: italianText(w), ro: answerText(w, "it-ro") })),
    random,
  );
  const rounds: MatchPair[][] = [];
  const rest = [...pairs];
  while (rest.length > 0) {
    const round: MatchPair[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < rest.length && round.length < MATCH_PAIRS_PER_ROUND; ) {
      const key = normalize(rest[i]!.ro);
      if (seen.has(key)) {
        i++;
        continue;
      }
      seen.add(key);
      round.push(...rest.splice(i, 1));
    }
    rounds.push(round);
  }
  // ultima rundă prea scurtă se completează cu perechi din prima
  const last = rounds.at(-1);
  if (rounds.length > 1 && last && last.length < 3) {
    const used = new Set(last.map((p) => normalize(p.ro)));
    for (const p of rounds[0]!) {
      if (last.length >= MATCH_PAIRS_PER_ROUND) break;
      if (!used.has(normalize(p.ro)) && !last.some((l) => l.wordId === p.wordId)) {
        last.push(p);
        used.add(normalize(p.ro));
      }
    }
  }
  return rounds;
}

export interface FollowQuestion {
  /** Elementul din care pornește întrebarea. */
  fromId: string;
  /** „after” = ce urmează după; „before” = ce era înainte. */
  kind: "after" | "before";
  correctId: string;
  optionIds: string[];
}

/**
 * Întrebări „Ce urmează după martedì?” / „Ce era înainte de martedì?” pentru o secvență ordonată.
 * La secvențe ciclice (zile, luni, anotimpuri) după ultimul element vine primul.
 */
export function buildFollowQuestions(
  sequence: readonly string[],
  cyclic: boolean,
  count = 5,
  random: Random = Math.random,
): FollowQuestion[] {
  const n = sequence.length;
  const candidates: FollowQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const after = cyclic ? sequence[(i + 1) % n] : sequence[i + 1];
    const before = cyclic ? sequence[(i + n - 1) % n] : sequence[i - 1];
    for (const [kind, correct] of [["after", after], ["before", before]] as const) {
      if (!correct) continue;
      const others = shuffle(
        sequence.filter((id) => id !== correct && id !== sequence[i]),
        random,
      ).slice(0, 3);
      candidates.push({
        fromId: sequence[i]!,
        kind,
        correctId: correct,
        optionIds: shuffle([correct, ...others], random),
      });
    }
  }
  return shuffle(candidates, random).slice(0, count);
}

/** Verifică ordinea: `true` dacă elementul ales acum este următorul din secvență. */
export const isNextInSequence = (sequence: readonly string[], placed: readonly string[], candidate: string) =>
  sequence[placed.length] === candidate;
