import { z } from "zod";
import { withSettingDefaults, type Settings } from "../../domain/settings.ts";
import type { ReviewLogEntry, StoredCard } from "../../domain/srs/types.ts";
import type { ImparaDb, ReportRow } from "../db/db.ts";
import { getSettings, syncUserOf } from "../db/repositories.ts";
import { newUid } from "../../domain/sync/serialize.ts";
import { t } from "../../i18n/standalone.ts";
import { notifyLocalChange } from "../sync/signal.ts";

export const BACKUP_FORMAT = "impara-backup";
export const BACKUP_VERSION = 1;

// Datele ajung din JSON ca șiruri ISO; `coerce.date` le readuce la obiecte Date.
const date = z.coerce.date();
const int = z.number().int();

export const cardSchema = z.object({
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

export const reviewLogSchema = z.object({
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

export const settingsSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  newPerDay: int.min(0).max(200),
  nounShare: int.min(0).max(100),
  newConjPerDay: int.min(0).max(50),
  maxReviewsPerDay: int.min(0).max(1000),
  retention: z.number().min(0.7).max(0.99),
  direction: z.enum(["it-ro", "ro-it", "both"]),
  newReversePerDay: int.min(0).max(200),
  conjugationMode: z.enum(["write", "flip", "table"]),
  ttsRate: z.number().min(0.3).max(2),
  ttsVoiceURI: z.string().nullable(),
  theme: z.enum(["auto", "light", "dark"]),
  soundEnabled: z.boolean(),
  nativeHelp: z.boolean(),
  uiLanguage: z.enum(["ro", "it"]),
});

export const reportSchema = z.object({
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
  const [cards, reviewLog, settings, reports] = await Promise.all([
    db.cards.toArray(),
    db.reviewLog.toArray(),
    getSettings(db),
    db.reports.toArray(),
  ]);
  await db.meta.put({ key: "lastExportAt", value: now.toISOString() });
  // metadatele de sincronizare (updatedAt, uid, dirty) nu fac parte din backup: se regenerează la import
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    dataVersion,
    cards: cards.map(({ updatedAt: _u, dirty: _d, ...card }) => card),
    reviewLog: reviewLog.map(({ uid: _uid, dirty: _d, ...entry }) => entry),
    settings,
    reports: reports.map(({ uid: _uid, dirty: _d, ...report }) => report),
  };
}

export function backupToJson(backup: Backup): string {
  // Date.toJSON produce șiruri ISO.
  return JSON.stringify(backup, null, 2);
}

export class BackupError extends Error {}

/** Citește și validează un fișier de backup; aruncă BackupError cu un mesaj clar, în limba interfeței. */
export function parseBackup(json: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupError(t("err.backupNotJson"));
  }
  if (typeof raw === "object" && raw !== null && (raw as { format?: unknown }).format !== BACKUP_FORMAT) {
    throw new BackupError(t("err.backupNotOurs"));
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BackupError(
      t("err.backupInvalid", { path: issue?.path.join(".") ?? "?", issue: issue?.message ?? t("err.backupGeneric") }),
    );
  }
  const { settings, ...rest } = parsed.data;
  return { ...rest, settings: withSettingDefaults(settings) } as Backup;
}

/**
 * Înlocuiește tot progresul cu cel din backup, într-o singură tranzacție. Tot ce intră este marcat „netrimis”,
 * iar cu cont se cere înlocuirea completă pe server (progresul din cont devine exact cel din backup).
 */
export async function importBackup(db: ImparaDb, backup: Backup, now: Date = new Date()): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewLog, db.settings, db.reports, db.tombstones, db.meta], async () => {
    await Promise.all([db.cards.clear(), db.reviewLog.clear(), db.reports.clear(), db.tombstones.clear()]);
    await db.cards.bulkAdd(backup.cards.map((card) => ({ ...card, updatedAt: now.getTime(), dirty: 1 as const })));
    await db.reviewLog.bulkAdd(backup.reviewLog.map((entry) => ({ ...entry, uid: newUid(), dirty: 1 as const })));
    await db.reports.bulkAdd(backup.reports.map((report) => ({ ...report, uid: newUid(), dirty: 1 as const })));
    await db.settings.put({ ...backup.settings, key: "app", updatedAt: now.getTime(), dirty: 1 });
    if (await syncUserOf(db)) await db.meta.put({ key: "syncReplace", value: true });
  });
  notifyLocalChange();
}

/** Șterge tot progresul (carduri, jurnal, semnalări); setările rămân. Cu cont, se șterge și din cont. */
export async function resetProgress(db: ImparaDb): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewLog, db.reports, db.tombstones, db.meta], async () => {
    await Promise.all([db.cards.clear(), db.reviewLog.clear(), db.reports.clear(), db.tombstones.clear()]);
    if (await syncUserOf(db)) await db.meta.put({ key: "syncReplace", value: true });
  });
  notifyLocalChange();
}
