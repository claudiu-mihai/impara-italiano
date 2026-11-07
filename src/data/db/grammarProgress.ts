import type { GrammarGame } from "../../domain/grammar/progress.ts";
import { notifyLocalChange } from "../sync/signal.ts";
import type { GrammarProgressRow, ImparaDb } from "./db.ts";

/** Aplică o modificare progresului unei teme; scrie (și marchează „netrimis”) doar dacă s-a schimbat ceva. */
async function updateProgress(
  db: ImparaDb,
  topicId: string,
  now: Date,
  change: (row: GrammarProgressRow) => boolean,
): Promise<void> {
  let changed = false;
  await db.transaction("rw", db.grammarProgress, async () => {
    const current = await db.grammarProgress.get(topicId);
    const row: GrammarProgressRow = current
      ? { ...current, best: { ...current.best } }
      : { topicId, best: {}, updatedAt: now.getTime() };
    if (!change(row)) return;
    await db.grammarProgress.put({ ...row, updatedAt: now.getTime(), dirty: 1 });
    changed = true;
  });
  if (changed) notifyLocalChange();
}

/** Marchează lecția ca citită; prima dată rămâne. */
export function markLessonRead(db: ImparaDb, topicId: string, now: Date): Promise<void> {
  return updateProgress(db, topicId, now, (row) => {
    if (row.readAt !== undefined) return false;
    row.readAt = now.getTime();
    return true;
  });
}

/** Salvează scorul (procent) unui joc, doar dacă depășește cel mai bun scor de până acum. */
export function saveGameScore(db: ImparaDb, topicId: string, game: GrammarGame, percent: number, now: Date): Promise<void> {
  return updateProgress(db, topicId, now, (row) => {
    if ((row.best[game] ?? -1) >= percent) return false;
    row.best[game] = percent;
    return true;
  });
}
