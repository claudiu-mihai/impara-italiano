import type { FeedSources } from "../domain/feed/buildFeedBatch.ts";
import type { FeedSeen } from "../domain/feed/pack.ts";
import type { Settings } from "../domain/settings.ts";
import type { SessionItem } from "../domain/session/buildDailySession.ts";
import type { StoredCard } from "../domain/srs/types.ts";
import { loadDialogues, loadFeed, loadGrammar, loadSentences, loadStories, loadWordDetails, type ContentStore } from "./content/contentStore.ts";
import type { ImparaDb } from "./db/db.ts";
import { loadFeedSeen } from "./feed/feedSeen.ts";
import { loadStudyOverview } from "./queries.ts";

/** Tot conținutul din care se alcătuiește fluxul, încărcat în paralel și la cerere (nu intră în pachetul de pornire). */
export async function loadFeedSources(content: ContentStore): Promise<FeedSources> {
  const [details, sentences, grammar, dialogues, stories, pack] = await Promise.all([
    loadWordDetails(),
    loadSentences(),
    loadGrammar(),
    loadDialogues(),
    loadStories(),
    loadFeed(),
  ]);
  return { words: content.words, details, sentences, grammar, dialogues, stories, pack };
}

export interface FeedProgress {
  settings: Settings;
  /** Coada sesiunii zilnice: repetiții scadente și carduri noi, în limitele zilei. */
  queue: SessionItem[];
  /** Cardurile de vocabular. */
  cards: StoredCard[];
  /** Repetițiile scadente din coadă. */
  dueCount: number;
  seen: FeedSeen;
}

/** Ce știe aplicația despre progres chiar acum; se recitește înaintea fiecărui lot, ca notele din flux să se vadă. */
export async function loadFeedProgress(db: ImparaDb, content: ContentStore, now: Date = new Date()): Promise<FeedProgress> {
  const [overview, cards, seen] = await Promise.all([
    loadStudyOverview(db, content, now),
    db.cards.where("kind").equals("vocab").toArray(),
    loadFeedSeen(db),
  ]);
  return { settings: overview.settings, queue: overview.queue, cards, dueCount: overview.dueCount, seen };
}
