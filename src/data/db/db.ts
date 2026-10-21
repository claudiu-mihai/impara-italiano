import Dexie, { type EntityTable } from "dexie";
import type { Settings } from "../../domain/settings.ts";
import type { ReviewLogEntry, StoredCard } from "../../domain/srs/types.ts";

export type SettingsRow = Settings & { key: "app" };
export interface MetaRow {
  key: string;
  value: unknown;
}
export interface ReportRow {
  id?: number;
  wordId: string;
  createdAt: Date;
  message?: string;
}

export type ImparaDb = Dexie & {
  cards: EntityTable<StoredCard, "cardId">;
  reviewLog: EntityTable<ReviewLogEntry, "id">;
  settings: EntityTable<SettingsRow, "key">;
  reports: EntityTable<ReportRow, "id">;
  meta: EntityTable<MetaRow, "key">;
};

export function createDb(name = "impara-italiano"): ImparaDb {
  const db = new Dexie(name) as ImparaDb;
  // Fiecare schimbare de schemă primește o versiune nouă, cu funcție de migrare dacă e nevoie.
  db.version(1).stores({
    cards: "cardId, due, wordId, kind, state",
    reviewLog: "++id, cardId, studyDay",
    settings: "key",
    reports: "++id, wordId",
    meta: "key",
  });
  return db;
}
