import { MissingCollectionError, type Collection, type RemoteItem, type SyncItem, type SyncRemote } from "./types.ts";

/**
 * Un „server” în memorie pentru teste: aceleași reguli ca serverul real (upsert după cheie, ora serverului
 * monotonă, înlocuire necondiționată). Mai mulți clienți pot împărți aceeași instanță, ca să simuleze
 * dispozitive diferite ale aceluiași cont.
 */
export class FakeRemote implements SyncRemote {
  readonly store: Record<Collection, Map<string, RemoteItem>> = {
    cards: new Map(),
    review_logs: new Map(),
    settings: new Map(),
    reports: new Map(),
    grammar_progress: new Map(),
  };
  private clock = 0;
  pushes = 0;
  pulls = 0;
  /** Se apelează înaintea fiecărui `push`; testele îl folosesc ca să simuleze o schimbare în timpul trimiterii. */
  beforePush?: (collection: Collection, items: SyncItem[]) => Promise<void> | void;
  /** Dacă este setat, următoarele apeluri aruncă această eroare (rețea căzută, sesiune expirată). */
  failWith?: Error;
  /** Colecții pe care „serverul” nu le are încă (server neactualizat). */
  readonly missing = new Set<Collection>();

  private check(collection: Collection): void {
    if (this.failWith) throw this.failWith;
    if (this.missing.has(collection)) throw new MissingCollectionError(collection);
  }

  private tick(): string {
    return `2026-10-21 10:00:00.${String(++this.clock).padStart(6, "0")}Z`;
  }

  async pull(collection: Collection, since: string | null): Promise<RemoteItem[]> {
    this.check(collection);
    this.pulls++;
    return [...this.store[collection].values()]
      .filter((item) => since === null || item.updated >= since)
      .sort((a, b) => (a.updated < b.updated ? -1 : 1))
      .map((item) => structuredClone(item));
  }

  async push(collection: Collection, items: SyncItem[]): Promise<void> {
    this.check(collection);
    await this.beforePush?.(collection, items);
    this.pushes++;
    for (const item of items) {
      this.store[collection].set(item.key, { ...structuredClone(item), updated: this.tick() });
    }
  }

  async deleteAll(collections: Collection[]): Promise<void> {
    for (const c of collections) this.check(c);
    for (const c of collections) this.store[c].clear();
  }

  async hasProgress(): Promise<boolean> {
    return this.store.cards.size > 0 || this.store.review_logs.size > 0;
  }
}
