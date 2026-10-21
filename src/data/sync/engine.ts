import { mergeCard, mergeSettingsTimes } from "../../domain/sync/merge.ts";
import { cardToData, logToData, newUid } from "../../domain/sync/serialize.ts";
import type { StoredCard } from "../../domain/srs/types.ts";
import { cardSchema, reportSchema, reviewLogSchema, settingsSchema } from "../backup/backup.ts";
import type { ImparaDb, LogRow, ReportRow } from "../db/db.ts";
import { getSettings } from "../db/repositories.ts";
import { getMeta } from "./pending.ts";
import type { Collection, RemoteItem, SyncItem, SyncRemote, SyncReport } from "./types.ts";

/** Câte înregistrări pleacă într-o singură cerere (serverul acceptă 100 într-un lot). */
export const PUSH_CHUNK = 50;

const PULL_ORDER: Collection[] = ["settings", "cards", "review_logs", "reports"];

const logDataSchema = reviewLogSchema.omit({ id: true });
const reportDataSchema = reportSchema.omit({ id: true });
// vocea aleasă depinde de dispozitiv, deci nu se sincronizează
const settingsDataSchema = settingsSchema.omit({ ttsVoiceURI: true }).partial();

type Pulled = Partial<Record<Collection, string>>;

/**
 * O rulare de sincronizare: descarcă ce s-a schimbat pe server și îl combină cu starea locală, apoi trimite
 * modificările locale. Aruncă la erori de rețea sau de autentificare; ce nu a fost trimis rămâne marcat „netrimis”,
 * deci o rulare următoare reia de unde a rămas.
 */
export async function runSync(db: ImparaDb, remote: SyncRemote): Promise<SyncReport> {
  const report: SyncReport = { pulled: 0, pushed: 0, invalid: 0 };
  const replace = (await getMeta<boolean>(db, "syncReplace")) === true;

  if (replace) {
    // import sau resetare cu cont: progresul din cont devine exact cel local
    await remote.deleteAll(["cards", "review_logs", "reports"]);
    const pulled = (await getMeta<Pulled>(db, "syncPulled")) ?? {};
    await db.meta.put({ key: "syncPulled", value: { settings: pulled.settings } satisfies Pulled });
  } else {
    await pullAll(db, remote, report);
  }
  await pushAll(db, remote, report);
  if (replace) await db.meta.delete("syncReplace");

  await db.meta.put({ key: "syncLastAt", value: new Date().toISOString() });
  return report;
}

// ---------------------------------------------------------------------------------------------------------------
// Descărcare

async function pullAll(db: ImparaDb, remote: SyncRemote, report: SyncReport): Promise<void> {
  const pulled: Pulled = { ...((await getMeta<Pulled>(db, "syncPulled")) ?? {}) };
  for (const collection of PULL_ORDER) {
    const items = await remote.pull(collection, pulled[collection] ?? null);
    if (items.length === 0) continue;
    await db.transaction("rw", [db.cards, db.reviewLog, db.reports, db.settings, db.tombstones, db.meta], async () => {
      const result =
        collection === "cards"
          ? await applyCards(db, items)
          : collection === "settings"
            ? await applySettings(db, items)
            : await applyAppendOnly(db, collection, items);
      report.pulled += result.changed;
      report.invalid += result.invalid;
      pulled[collection] = items.reduce((max, item) => (item.updated > max ? item.updated : max), items[0]!.updated);
      await db.meta.put({ key: "syncPulled", value: { ...pulled } });
    });
  }
}

interface Applied {
  changed: number;
  invalid: number;
}

async function applyCards(db: ImparaDb, items: RemoteItem[]): Promise<Applied> {
  const result: Applied = { changed: 0, invalid: 0 };
  for (const item of items) {
    let remoteCard: StoredCard | undefined;
    if (!item.deleted) {
      const parsed = cardSchema.safeParse(item.data);
      if (!parsed.success) {
        result.invalid++;
        continue;
      }
      remoteCard = parsed.data as StoredCard;
    }
    const local = await db.cards.get(item.key);
    const tombstone = await db.tombstones.get(item.key);
    const merge = mergeCard(
      { card: local, deletedAt: tombstone?.deletedAt },
      { updatedAt: item.updatedAt ?? 0, deleted: item.deleted === true, card: remoteCard },
    );
    switch (merge.action) {
      case "apply":
        // rândul nou nu are `dirty`: ce vine de pe server nu se retrimite
        await db.cards.put({ ...merge.card, updatedAt: item.updatedAt ?? 0 });
        await db.tombstones.delete(item.key);
        result.changed++;
        break;
      case "remove":
        if (local) result.changed++;
        await db.cards.delete(item.key);
        await db.tombstones.delete(item.key);
        break;
      case "keep-and-push":
        // local este mai nou decât serverul (ex. serverul a primit o versiune veche): se retrimite
        if (local) await db.cards.put({ ...local, dirty: 1 });
        break;
      case "keep":
        break;
    }
  }
  return result;
}

async function applySettings(db: ImparaDb, items: RemoteItem[]): Promise<Applied> {
  const result: Applied = { changed: 0, invalid: 0 };
  for (const item of items) {
    const parsed = settingsDataSchema.safeParse(item.data);
    if (!parsed.success) {
      result.invalid++;
      continue;
    }
    const local = await db.settings.get("app");
    const outcome = mergeSettingsTimes(local?.updatedAt, item.updatedAt ?? 0);
    if (outcome === "apply") {
      const current = await getSettings(db);
      await db.settings.put({ ...current, ...parsed.data, key: "app", updatedAt: item.updatedAt ?? 0 });
      result.changed++;
    } else if (outcome === "keep-and-push" && local) {
      await db.settings.put({ ...local, dirty: 1 });
    }
  }
  return result;
}

/** Jurnalul și semnalările se doar adaugă: o intrare cu un `uid` deja cunoscut se ignoră. */
async function applyAppendOnly(db: ImparaDb, collection: "review_logs" | "reports", items: RemoteItem[]): Promise<Applied> {
  const result: Applied = { changed: 0, invalid: 0 };
  const table = collection === "review_logs" ? db.reviewLog : db.reports;
  const known = new Set(
    (await table.where("uid").anyOf(items.map((i) => i.key)).toArray()).map((row) => (row as { uid?: string }).uid),
  );
  const fresh: (LogRow | ReportRow)[] = [];
  for (const item of items) {
    if (known.has(item.key)) continue;
    known.add(item.key);
    const parsed = (collection === "review_logs" ? logDataSchema : reportDataSchema).safeParse(item.data);
    if (!parsed.success) {
      result.invalid++;
      continue;
    }
    fresh.push({ ...(parsed.data as LogRow | ReportRow), uid: item.key });
  }
  if (fresh.length > 0) await (table as typeof db.reviewLog).bulkAdd(fresh as LogRow[]);
  result.changed = fresh.length;
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// Trimitere

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function pushAll(db: ImparaDb, remote: SyncRemote, report: SyncReport): Promise<void> {
  await pushCards(db, remote, report);
  await pushAppendOnly(db, remote, report, "review_logs");
  await pushAppendOnly(db, remote, report, "reports");
  await pushSettings(db, remote, report);
}

async function pushCards(db: ImparaDb, remote: SyncRemote, report: SyncReport): Promise<void> {
  const cards = await db.cards.where("dirty").equals(1).toArray();
  const tombstones = await db.tombstones.toArray();
  const items: SyncItem[] = [
    ...cards.map((card) => ({
      key: card.cardId,
      updatedAt: card.updatedAt ?? 0,
      deleted: false,
      data: cardToData(card),
    })),
    ...tombstones.map((t) => ({ key: t.cardId, updatedAt: t.deletedAt, deleted: true, data: {} })),
  ];
  for (const chunk of chunks(items, PUSH_CHUNK)) await remote.push("cards", chunk);
  report.pushed += items.length;

  // „netrimis” se șterge doar dacă rândul nu s-a mai schimbat între timp (altfel rămâne pentru următoarea rulare)
  await db.transaction("rw", db.cards, db.tombstones, async () => {
    for (const sent of cards) {
      const current = await db.cards.get(sent.cardId);
      if (current && current.updatedAt === sent.updatedAt) {
        const { dirty: _dirty, ...clean } = current;
        await db.cards.put(clean);
      }
    }
    for (const sent of tombstones) {
      if ((await db.tombstones.get(sent.cardId))?.deletedAt === sent.deletedAt) await db.tombstones.delete(sent.cardId);
    }
  });
}

async function pushAppendOnly(
  db: ImparaDb,
  remote: SyncRemote,
  report: SyncReport,
  collection: "review_logs" | "reports",
): Promise<void> {
  const table = (collection === "review_logs" ? db.reviewLog : db.reports) as typeof db.reviewLog;
  const rows = await table.where("dirty").equals(1).toArray();
  if (rows.length === 0) return;

  // un rând fără uid (nu ar trebui să existe după migrare) primește unul acum
  const missing = rows.filter((row) => !row.uid);
  for (const row of missing) {
    row.uid = newUid();
    await table.update(row.id!, { uid: row.uid });
  }

  const items: SyncItem[] = rows.map((row) => ({
    key: row.uid!,
    data: collection === "review_logs" ? logToData(row) : reportData(row as unknown as ReportRow),
  }));
  for (const chunk of chunks(items, PUSH_CHUNK)) await remote.push(collection, chunk);
  report.pushed += items.length;

  await table.where("id").anyOf(rows.map((r) => r.id!)).modify((row) => {
    delete row.dirty;
  });
}

function reportData(report: ReportRow): Record<string, unknown> {
  const { id: _id, uid: _uid, dirty: _dirty, ...rest } = report;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
}

async function pushSettings(db: ImparaDb, remote: SyncRemote, report: SyncReport): Promise<void> {
  const row = await db.settings.get("app");
  if (!row?.dirty) return;
  const { ttsVoiceURI: _voice, ...shared } = await getSettings(db);
  await remote.push("settings", [{ key: "app", updatedAt: row.updatedAt ?? 0, data: shared }]);
  report.pushed++;
  const current = await db.settings.get("app");
  if (current && current.updatedAt === row.updatedAt) {
    const { dirty: _dirty, ...clean } = current;
    await db.settings.put(clean);
  }
}
