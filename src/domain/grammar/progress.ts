/** Jocurile de gramatică care dau scor (Cartonașele sunt doar pentru exersat). */
export type GrammarGame = "match" | "type";

/** Progresul la o temă de gramatică: când a fost citită lecția și cel mai bun scor (procent) la fiecare joc. */
export interface GrammarProgress {
  readAt?: number;
  best: Partial<Record<GrammarGame, number>>;
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
