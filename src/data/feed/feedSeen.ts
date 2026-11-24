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

// Ziua de studiu în care s-a arătat cardul „Repetiții gata” (o dată pe zi). Tot local, nesincronizat.
const REVIEWS_DONE_KEY = "feedReviewsDoneDay";

export async function getReviewsDoneDay(db: ImparaDb): Promise<string | undefined> {
  return (await db.meta.get(REVIEWS_DONE_KEY))?.value as string | undefined;
}

export async function setReviewsDoneDay(db: ImparaDb, studyDay: string): Promise<void> {
  await db.meta.put({ key: REVIEWS_DONE_KEY, value: studyDay });
}
