import { ClientResponseError, type default as PocketBase } from "pocketbase";
import { t } from "../../i18n/standalone.ts";
import { withRetry } from "./retry.ts";
import { MissingCollectionError, type Collection, type RemoteItem, type SyncItem, type SyncRemote } from "./types.ts";

/**
 * Id-ul înregistrării este derivat din (utilizator, colecție, cheie): 15 caractere hexazecimale, forma pe care
 * o acceptă PocketBase. Așa „creează sau înlocuiește” este o singură cerere (upsert) și nu trebuie căutat
 * întâi ce există pe server; doi utilizatori nu pot avea niciodată același id.
 */
export async function recordId(userId: string, collection: Collection, key: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(t("err.httpsRequired"));
  }
  const bytes = new TextEncoder().encode(`${userId}\n${collection}\n${key}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash.slice(0, 8), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 15);
}

/** Serverul limitează numărul de cereri pe secundă (429): cererea se reia după o pauză. */
const retry = <T>(run: () => Promise<T>) => withRetry(run, (e) => e instanceof ClientResponseError && e.status === 429);

/** Câte înregistrări se șterg într-un lot (serverul acceptă 100). */
const DELETE_CHUNK = 50;

interface Row {
  id: string;
  updated: string;
  [field: string]: unknown;
}

function toItem(collection: Collection, row: Row): RemoteItem {
  switch (collection) {
    case "cards":
      return { key: row.cardId as string, data: row.data, updatedAt: row.updatedAt as number, deleted: row.deleted === true, updated: row.updated };
    case "settings":
      return { key: "app", data: row.data, updatedAt: row.updatedAt as number, updated: row.updated };
    case "grammar_progress":
      return { key: row.topicId as string, data: row.data, updatedAt: row.updatedAt as number, updated: row.updated };
    default:
      return { key: row.uid as string, data: row.data, updated: row.updated };
  }
}

function toFields(collection: Collection, item: SyncItem): Record<string, unknown> {
  switch (collection) {
    case "cards":
      return { cardId: item.key, data: item.data, updatedAt: item.updatedAt ?? 0, deleted: item.deleted === true };
    case "settings":
      return { data: item.data, updatedAt: item.updatedAt ?? 0 };
    case "grammar_progress":
      return { topicId: item.key, data: item.data, updatedAt: item.updatedAt ?? 0 };
    default:
      return { uid: item.key, data: item.data };
  }
}

const is404 = (error: unknown) => error instanceof ClientResponseError && error.status === 404;

/** Serverul real: PocketBase, cu regulile de acces „fiecare vede doar înregistrările lui”. */
export class PocketBaseRemote implements SyncRemote {
  private readonly pb: PocketBase;
  private readonly userId: string;

  constructor(pb: PocketBase, userId: string) {
    this.pb = pb;
    this.userId = userId;
  }

  /**
   * O eroare care vine dintr-o colecție lipsă devine MissingCollectionError. Citirea dă direct 404; trimiterea în lot
   * dă doar un 400 generic, așa că atunci se verifică printr-o citire scurtă dacă lipsește colecția.
   */
  private async explain(collection: Collection, error: unknown): Promise<never> {
    if (is404(error)) throw new MissingCollectionError(collection);
    try {
      await this.pb.collection(collection).getList(1, 1, { fields: "id" });
    } catch (probe) {
      if (is404(probe)) throw new MissingCollectionError(collection);
    }
    throw error;
  }

  async pull(collection: Collection, since: string | null): Promise<RemoteItem[]> {
    try {
      const rows = await retry(() =>
        this.pb.collection(collection).getFullList<Row>({
          batch: 500,
          sort: "updated,id",
          filter: since ? this.pb.filter("updated >= {:since}", { since }) : undefined,
        }),
      );
      return rows.map((row) => toItem(collection, row));
    } catch (error) {
      return this.explain(collection, error);
    }
  }

  async push(collection: Collection, items: SyncItem[]): Promise<void> {
    if (items.length === 0) return;
    const batch = this.pb.createBatch();
    for (const item of items) {
      batch.collection(collection).upsert({
        id: await recordId(this.userId, collection, item.key),
        user: this.userId,
        ...toFields(collection, item),
      });
    }
    try {
      await retry(() => batch.send());
    } catch (error) {
      await this.explain(collection, error);
    }
  }

  async deleteAll(collections: Collection[]): Promise<void> {
    for (const collection of collections) {
      const rows = await retry(() =>
        this.pb.collection(collection).getFullList<{ id: string }>({ batch: 500, fields: "id" }),
      ).catch((error: unknown) => this.explain(collection, error));
      for (let i = 0; i < rows.length; i += DELETE_CHUNK) {
        const batch = this.pb.createBatch();
        for (const row of rows.slice(i, i + DELETE_CHUNK)) batch.collection(collection).delete(row.id);
        await retry(() => batch.send());
      }
    }
  }

  async hasProgress(): Promise<boolean> {
    for (const collection of ["cards", "review_logs"] as const) {
      const page = await retry(() => this.pb.collection(collection).getList(1, 1, { fields: "id" }));
      if (page.totalItems > 0) return true;
    }
    return false;
  }
}
