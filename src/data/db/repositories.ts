import type { ReviewLog } from "ts-fsrs";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import { Rating } from "ts-fsrs";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { vocabCardId, type Direction, type ReviewSource, type StoredCard } from "../../domain/srs/types.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import type { ImparaDb } from "./db.ts";

export interface SaveReviewOptions {
  source: ReviewSource;
  now: Date;
  durationMs?: number;
}

/** Salvează cardul actualizat și intrarea din jurnal în aceeași tranzacție. */
export async function saveReview(
  db: ImparaDb,
  card: StoredCard,
  log: ReviewLog,
  { source, now, durationMs }: SaveReviewOptions,
): Promise<void> {
  await db.transaction("rw", db.cards, db.reviewLog, async () => {
    await db.cards.put(card);
    await db.reviewLog.add({
      cardId: card.cardId,
      rating: log.rating,
      reviewedAt: now,
      studyDay: studyDayOf(now),
      source,
      durationMs,
      fsrs: log,
    });
  });
}

export function countReviewsOn(db: ImparaDb, studyDay: string): Promise<number> {
  return db.reviewLog.where("studyDay").equals(studyDay).count();
}

export async function getSettings(db: ImparaDb): Promise<Settings> {
  const row = await db.settings.get("app");
  if (!row) return DEFAULT_SETTINGS;
  const { key: _key, ...saved } = row;
  // Câmpurile adăugate ulterior primesc valoarea implicită.
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(db: ImparaDb, settings: Settings): Promise<void> {
  await db.settings.put({ ...settings, key: "app" });
}

/** `introducedOn` pentru cuvintele marcate „Știu deja”: nu consumă limita de cuvinte noi a zilei. */
export const KNOWN_MARKER = "known";

/**
 * Marchează un cuvânt ca știut: creează cardurile (ambele direcții) ca și cum ar fi fost notate „Ușor”,
 * deci vor reveni la repetiție peste câteva zile, fără a număra ca învățare azi și fără intrare în jurnal.
 * Cardurile deja existente nu se ating.
 */
export async function markWordKnown(db: ImparaDb, wordId: string, now: Date, retention: number): Promise<void> {
  const directions: Direction[] = ["it-ro", "ro-it"];
  await db.transaction("rw", db.cards, async () => {
    for (const direction of directions) {
      const cardId = vocabCardId(wordId, direction);
      if (await db.cards.get(cardId)) continue;
      const fresh = newStoredCard({ cardId, wordId, kind: "vocab", variant: direction }, now, KNOWN_MARKER);
      await db.cards.put(reviewStoredCard(fresh, Rating.Easy, now, retention).card);
    }
  });
}

/** Șterge tot progresul unui cuvânt (carduri de vocabular și de conjugare); jurnalul rămâne. */
export async function forgetWord(db: ImparaDb, wordId: string): Promise<void> {
  await db.cards.where("wordId").equals(wordId).delete();
}
