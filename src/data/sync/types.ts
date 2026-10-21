/** Colecțiile de pe server (vezi pocketbase/pb_migrations). */
export type Collection = "cards" | "review_logs" | "settings" | "reports";

/** O înregistrare de trimis: cheia ei stabilă (cardId, uid sau „app”) și conținutul JSON. */
export interface SyncItem {
  key: string;
  data: unknown;
  /** Doar la carduri și setări: momentul modificării (ms), după care se rezolvă conflictele. */
  updatedAt?: number;
  /** Doar la carduri: ștergere marcată. */
  deleted?: boolean;
}

/** O înregistrare primită; `updated` este ora serverului (monotonă), folosită ca reper la descărcare. */
export interface RemoteItem extends SyncItem {
  updated: string;
}

/**
 * Ce are nevoie motorul de sincronizare de la server. Implementarea reală (PocketBase) este în
 * `pocketbaseRemote.ts`; testele folosesc un server în memorie.
 */
export interface SyncRemote {
  /** Înregistrările cu `updated >= since` (toate, dacă `since` este null), în ordinea `updated`. */
  pull(collection: Collection, since: string | null): Promise<RemoteItem[]>;
  /** Creează sau înlocuiește (upsert) înregistrările după cheie. */
  push(collection: Collection, items: SyncItem[]): Promise<void>;
  /** Șterge toate înregistrările utilizatorului din colecțiile date. */
  deleteAll(collections: Collection[]): Promise<void>;
  /** Contul are deja progres pe server (carduri sau jurnal)? */
  hasProgress(): Promise<boolean>;
}

/** Cum a mers o rulare de sincronizare. */
export interface SyncReport {
  /** Înregistrări primite de pe server care au schimbat ceva local. */
  pulled: number;
  /** Înregistrări trimise pe server. */
  pushed: number;
  /** Înregistrări de pe server ignorate pentru că nu au forma așteptată. */
  invalid: number;
}
