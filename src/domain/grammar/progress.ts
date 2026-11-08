/** Jocurile de gramatică care dau scor (Cartonașele sunt doar pentru exersat). */
export type GrammarGame = "match" | "type";

/**
 * Progresul la o temă de gramatică: când a fost citită lecția și cel mai bun scor (procent) la fiecare joc.
 * `best` poate avea și jocuri pe care această versiune nu le cunoaște (venite de la o versiune mai nouă):
 * se păstrează și se trimit mai departe, ca să nu se piardă.
 */
export interface GrammarProgress {
  readAt?: number;
  best: Partial<Record<GrammarGame, number>> & Record<string, number | undefined>;
}

/** Scriere: răspunsuri corecte din total. */
export function typeScore(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** Potrivire: perechi găsite, raportate la toate încercările (perechi + greșeli). */
export function matchScore(pairs: number, mistakes: number): number {
  return pairs === 0 ? 0 : Math.round((pairs / (pairs + mistakes)) * 100);
}

/** Cel mai bun scor dintre jocuri, dacă există vreunul. */
export function bestScore(progress: GrammarProgress | undefined): number | undefined {
  const values = Object.values(progress?.best ?? {}).filter((v): v is number => typeof v === "number");
  return values.length > 0 ? Math.max(...values) : undefined;
}

export interface GrammarSummary {
  /** Lecții citite din cele existente. */
  read: number;
  total: number;
  /** Media celor mai bune scoruri, doar pentru temele care au vreun scor; lipsește fără scoruri. */
  averageBest?: number;
}

/** Rezumatul progresului la gramatică; rândurile unor teme care nu mai există în conținut se ignoră. */
export function grammarSummary(
  topics: readonly { id: string }[],
  rows: readonly (GrammarProgress & { topicId: string })[],
): GrammarSummary {
  const byTopic = new Map(rows.map((row) => [row.topicId, row]));
  const own = topics.flatMap((topic) => byTopic.get(topic.id) ?? []);
  const scores = own.map((row) => bestScore(row)).filter((n): n is number => n !== undefined);
  const summary: GrammarSummary = { read: own.filter((row) => row.readAt !== undefined).length, total: topics.length };
  if (scores.length > 0) summary.averageBest = Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
  return summary;
}
