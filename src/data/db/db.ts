import Dexie, { type EntityTable } from "dexie";
import type { Settings } from "../../domain/settings.ts";
import type { ReviewLogEntry, StoredCard } from "../../domain/srs/types.ts";
import { newUid } from "../../domain/sync/serialize.ts";

/**
 * `updatedAt` = momentul ultimei modificări (ms); `dirty: 1` = modificare încă netrimisă pe server.
 * Câmpul `dirty` este 1 sau lipsește (nu `true` / `false`), pentru că IndexedDB indexează doar chei valide:
 * un rând fără `dirty` nu apare în index, deci `where("dirty").equals(1)` găsește exact ce așteaptă trimiterea.
 */
export interface SyncFlags {
  dirty?: 1;
}

export type CardRow = StoredCard & SyncFlags;
export type LogRow = ReviewLogEntry & SyncFlags;
export type SettingsRow = Settings & SyncFlags & { key: "app"; updatedAt?: number };
export interface MetaRow {
  key: string;
  value: unknown;
}
export interface ReportRow extends SyncFlags {
  id?: number;
  uid?: string;
  wordId: string;
  createdAt: Date;
  message?: string;
}
/** Un card șters cât timp ești autentificat: ștergerea trebuie să ajungă și pe server. */
export interface TombstoneRow {
  cardId: string;
  deletedAt: number;
}

export type ImparaDb = Dexie & {
  cards: EntityTable<CardRow, "cardId">;
  reviewLog: EntityTable<LogRow, "id">;
  settings: EntityTable<SettingsRow, "key">;
  reports: EntityTable<ReportRow, "id">;
  meta: EntityTable<MetaRow, "key">;
  tombstones: EntityTable<TombstoneRow, "cardId">;
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
  // v2 (Faza 6, sincronizare): câmpuri `updatedAt` / `uid` / `dirty` și tabelul `tombstones`.
  // Tot progresul existent se marchează „netrimis”, ca la prima autentificare să urce în cont.
  db.version(2)
    .stores({
      cards: "cardId, due, wordId, kind, state, dirty",
      reviewLog: "++id, cardId, studyDay, uid, dirty",
      settings: "key",
      reports: "++id, wordId, uid, dirty",
      meta: "key",
      tombstones: "cardId",
    })
    .upgrade(async (tx) => {
      const now = Date.now();
      await tx.table("cards").toCollection().modify((card: CardRow) => {
        card.updatedAt = (card.last_review ?? card.due)?.getTime?.() ?? now;
        card.dirty = 1;
      });
      await tx.table("reviewLog").toCollection().modify((log: LogRow) => {
        log.uid = newUid();
        log.dirty = 1;
      });
      await tx.table("reports").toCollection().modify((report: ReportRow) => {
        report.uid = newUid();
        report.dirty = 1;
      });
      await tx.table("settings").toCollection().modify((row: SettingsRow) => {
        row.updatedAt = now;
        row.dirty = 1;
      });
    });
  return db;
}
