import { z } from "zod";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import type { ReviewLogEntry, StoredCard } from "../../domain/srs/types.ts";
import type { ImparaDb, ReportRow } from "../db/db.ts";

export const BACKUP_FORMAT = "impara-backup";
export const BACKUP_VERSION = 1;

// Datele ajung din JSON ca șiruri ISO; `coerce.date` le readuce la obiecte Date.
const date = z.coerce.date();
const int = z.number().int();

const cardSchema = z.object({
  cardId: z.string(),
  wordId: z.string(),
  kind: z.enum(["vocab", "conj", "skill"]),
  variant: z.string(),
  introducedOn: z.string(),
  due: date,
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: int,
  lapses: int,
  state: int.min(0).max(3),
  last_review: date.optional(),
});

const reviewLogSchema = z.object({
  id: int.optional(),
  cardId: z.string(),
  rating: int.min(1).max(4),
  reviewedAt: date,
  studyDay: z.string(),
  source: z.enum(["flashcard", "quiz", "conj", "skill"]),
  durationMs: z.number().optional(),
  fsrs: z.object({
    rating: int,
    state: int.min(0).max(3),
    due: date,
    stability: z.number(),
    difficulty: z.number(),
    elapsed_days: z.number(),
    last_elapsed_days: z.number(),
    scheduled_days: z.number(),
    learning_steps: z.number(),
    review: date,
  }),
});

const settingsSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  newPerDay: int.min(0).max(200),
  newConjPerDay: int.min(0).max(50),
  maxReviewsPerDay: int.min(0).max(1000),
  retention: z.number().min(0.7).max(0.99),
  direction: z.enum(["it-ro", "ro-it"]),
  conjugationMode: z.enum(["write", "flip", "table"]),
  ttsRate: z.number().min(0.3).max(2),
  ttsVoiceURI: z.string().nullable(),
  theme: z.enum(["auto", "light", "dark"]),
  soundEnabled: z.boolean(),
});

const reportSchema = z.object({
  id: int.optional(),
  wordId: z.string(),
  createdAt: date,
  message: z.string().optional(),
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: date,
  dataVersion: z.string(),
  cards: z.array(cardSchema),
  reviewLog: z.array(reviewLogSchema),
  // Câmpurile lipsă (adăugate în versiuni ulterioare) primesc valorile implicite.
  settings: settingsSchema.partial(),
  reports: z.array(reportSchema),
});

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: Date;
  dataVersion: string;
  cards: StoredCard[];
  reviewLog: ReviewLogEntry[];
  settings: Settings;
  reports: ReportRow[];
}

export async function exportBackup(db: ImparaDb, dataVersion: string, now: Date): Promise<Backup> {
  const [cards, reviewLog, settingsRow, reports] = await Promise.all([
    db.cards.toArray(),
    db.reviewLog.toArray(),
    db.settings.get("app"),
    db.reports.toArray(),
  ]);
  const { key: _key, ...savedSettings } = settingsRow ?? { key: "app" as const };
  await db.meta.put({ key: "lastExportAt", value: now.toISOString() });
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    dataVersion,
    cards,
    reviewLog,
    settings: { ...DEFAULT_SETTINGS, ...savedSettings },
    reports,
  };
}

export function backupToJson(backup: Backup): string {
  // Date.toJSON produce șiruri ISO.
  return JSON.stringify(backup, null, 2);
}

export class BackupError extends Error {}

/** Citește și validează un fișier de backup; aruncă BackupError cu un mesaj clar în română. */
export function parseBackup(json: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupError("Fișierul nu este JSON valid.");
  }
  if (typeof raw === "object" && raw !== null && (raw as { format?: unknown }).format !== BACKUP_FORMAT) {
    throw new BackupError("Fișierul nu este un backup Impara l'Italiano.");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BackupError(`Backup invalid (${issue?.path.join(".") ?? "?"}: ${issue?.message ?? "eroare"}).`);
  }
  const { settings, ...rest } = parsed.data;
  return { ...rest, settings: { ...DEFAULT_SETTINGS, ...settings } } as Backup;
}

/** Înlocuiește tot progresul cu cel din backup, într-o singură tranzacție. */
export async function importBackup(db: ImparaDb, backup: Backup): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewLog, db.settings, db.reports], async () => {
    await Promise.all([db.cards.clear(), db.reviewLog.clear(), db.reports.clear()]);
    await db.cards.bulkAdd(backup.cards);
    await db.reviewLog.bulkAdd(backup.reviewLog);
    await db.reports.bulkAdd(backup.reports);
    await db.settings.put({ ...backup.settings, key: "app" });
  });
}

/** Șterge tot progresul (carduri, jurnal, semnalări); setările rămân. */
export async function resetProgress(db: ImparaDb): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewLog, db.reports], async () => {
    await Promise.all([db.cards.clear(), db.reviewLog.clear(), db.reports.clear()]);
  });
}
