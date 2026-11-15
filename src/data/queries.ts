import type { Conjugations, Topic } from "../domain/content/schema.ts";
import type { Tense } from "../domain/content/constants.ts";
import {
  buildConjugationSession,
  type ConjItem,
  type ConjVerb,
} from "../domain/session/buildConjugationSession.ts";
import { buildDailySession, type SessionItem } from "../domain/session/buildDailySession.ts";
import { buildTopicSession, topicWordIds } from "../domain/topics/topics.ts";
import { computeStats, type Stats } from "../domain/stats/stats.ts";
import type { Settings } from "../domain/settings.ts";
import { studyDayOf } from "../domain/time/studyDay.ts";
import { loadConjugationsRo, loadGuide, type ContentStore } from "./content/contentStore.ts";
import type { RoConjugations } from "../domain/conjugation/romanian.ts";
import type { ImparaDb } from "./db/db.ts";
import { countReviewsOn, getSettings } from "./db/repositories.ts";

export interface StudyOverview {
  settings: Settings;
  queue: SessionItem[];
  dueCount: number;
  newCount: number;
}

/** Citește progresul și construiește coada sesiunii zilnice. */
export async function loadStudyOverview(
  db: ImparaDb,
  content: ContentStore,
  now: Date = new Date(),
): Promise<StudyOverview> {
  const [settings, cards, reviewsDoneToday, guide] = await Promise.all([
    getSettings(db),
    db.cards.toArray(),
    countReviewsOn(db, studyDayOf(now)),
    loadGuide(),
  ]);

  const queue = buildDailySession({
    now,
    settings,
    cards,
    words: content.words,
    reviewsDoneToday,
    guide,
  });
  const newCount = queue.filter((i) => i.isNew).length;
  return { settings, queue, dueCount: queue.length - newCount, newCount };
}

export interface ConjugationOverview {
  settings: Settings;
  queue: ConjItem[];
  dueCount: number;
  newCount: number;
  /** Formele românești ale verbelor cu conjugare activă, pentru cerința cu traducere. */
  romanian: RoConjugations;
}

/**
 * Verbele care primesc timpuri noi: doar cele din lista de conjugare activă (verbele frecvente, cu forme românești),
 * cu timpurile disponibile. Restul verbelor rămân ca vocabular; cardurile de conjugare existente revin în continuare.
 */
export function conjugationVerbs(content: ContentStore, conjugations: Conjugations, romanian: RoConjugations): ConjVerb[] {
  return content.words
    .filter((w) => w.pos === "verb" && conjugations[w.id] && romanian[w.id])
    .map((w) => ({
      id: w.id,
      rank: w.rank,
      level: w.level,
      tenses: Object.keys(conjugations[w.id]!) as Tense[],
    }));
}

export async function loadConjugationOverview(
  db: ImparaDb,
  content: ContentStore,
  conjugations: Conjugations,
  now: Date = new Date(),
): Promise<ConjugationOverview> {
  const [settings, cards, reviewsDoneToday, romanian] = await Promise.all([
    getSettings(db),
    db.cards.toArray(),
    countReviewsOn(db, studyDayOf(now)),
    loadConjugationsRo(),
  ]);
  const queue = buildConjugationSession({
    now,
    settings,
    cards,
    verbs: conjugationVerbs(content, conjugations, romanian),
    reviewsDoneToday,
  });
  const newCount = queue.filter((i) => i.isNew).length;
  return { settings, queue, dueCount: queue.length - newCount, newCount, romanian };
}

/** Sesiunea „Studiază tema”: scadentele și cuvintele noi ale temei. */
export async function loadTopicStudy(
  db: ImparaDb,
  topic: Topic,
  now: Date = new Date(),
): Promise<{ settings: Settings; queue: SessionItem[] }> {
  const [settings, cards] = await Promise.all([getSettings(db), db.cards.toArray()]);
  const queue = buildTopicSession({ now, direction: settings.direction, cards, wordIds: topicWordIds(topic) });
  return { settings, queue };
}

export async function loadStats(
  db: ImparaDb,
  content: ContentStore,
  days: number,
  now: Date = new Date(),
): Promise<Stats> {
  const [log, cards] = await Promise.all([db.reviewLog.toArray(), db.cards.toArray()]);
  return computeStats({ now, days, log, cards, words: content.words });
}
