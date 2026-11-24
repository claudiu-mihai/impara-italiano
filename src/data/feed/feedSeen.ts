import type { FeedSeen } from "../../domain/feed/pack.ts";
import type { ImparaDb } from "../db/db.ts";

// Ce s-a văzut din pachetul fluxului, între vizite. Local, nesincronizat: pe alt dispozitiv se pot repeta câțiva itemi.
const KEY = "feedSeen";

export async function loadFeedSeen(db: ImparaDb): Promise<FeedSeen> {
  return ((await db.meta.get(KEY))?.value as FeedSeen | undefined) ?? {};
}

/** Notează momentul afișării itemului sau al testului lui, păstrând restul; într-o tranzacție, ca marcările simultane să nu se piardă. */
export async function markFeedSeen(db: ImparaDb, id: string, field: "shown" | "quizzed", now: Date): Promise<void> {
  await db.transaction("rw", db.meta, async () => {
    const seen = await loadFeedSeen(db);
    await db.meta.put({ key: KEY, value: { ...seen, [id]: { ...seen[id], [field]: now.getTime() } } });
  });
}
