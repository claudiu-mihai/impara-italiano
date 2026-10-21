import type { ImparaDb } from "../db/db.ts";

/** Fără dependențe grele (Zod, SDK): se poate folosi din ecranele de interfață fără să mărească pachetul lor. */

export const getMeta = async <T>(db: ImparaDb, key: string): Promise<T | undefined> =>
  (await db.meta.get(key))?.value as T | undefined;

/** Câte modificări locale așteaptă să fie trimise (cu cont; fără cont numărul nu are sens). */
export async function pendingCount(db: ImparaDb): Promise<number> {
  const [cards, tombstones, logs, reports, settings, replace] = await Promise.all([
    db.cards.where("dirty").equals(1).count(),
    db.tombstones.count(),
    db.reviewLog.where("dirty").equals(1).count(),
    db.reports.where("dirty").equals(1).count(),
    db.settings.get("app"),
    getMeta<boolean>(db, "syncReplace"),
  ]);
  return cards + tombstones + logs + reports + (settings?.dirty ? 1 : 0) + (replace ? 1 : 0);
}

/** Există progres local (carduri sau repetiții)? */
export async function hasLocalProgress(db: ImparaDb): Promise<boolean> {
  return (await db.cards.count()) > 0 || (await db.reviewLog.count()) > 0;
}
