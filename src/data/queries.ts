import type { Conjugations, Topic } from "../domain/content/schema.ts";
import type { Tense } from "../domain/content/constants.ts";
import { buildQuizRound, buildTopicQuizRound, type QuizQuestion } from "../domain/quiz/buildQuizRound.ts";
import {
  buildConjugationSession,
  type ConjItem,
  type ConjVerb,
} from "../domain/session/buildConjugationSession.ts";
import { buildSentenceRound, type SentenceItem } from "../domain/sentence/sentenceRound.ts";
import { buildDailySession, type SessionItem } from "../domain/session/buildDailySession.ts";
import { buildTopicSession, topicWordIds } from "../domain/topics/topics.ts";
import { computeStats, type Stats } from "../domain/stats/stats.ts";
import type { Settings } from "../domain/settings.ts";
import { studyDayOf } from "../domain/time/studyDay.ts";
import type { ContentStore } from "./content/contentStore.ts";
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
  const [settings, cards, reviewsDoneToday] = await Promise.all([
    getSettings(db),
    db.cards.toArray(),
    countReviewsOn(db, studyDayOf(now)),
  ]);

  const queue = buildDailySession({
    now,
    settings,
    cards,
    words: content.words,
    reviewsDoneToday,
  });
  const newCount = queue.filter((i) => i.isNew).length;
  return { settings, queue, dueCount: queue.length - newCount, newCount };
}

export interface ConjugationOverview {
  settings: Settings;
  queue: ConjItem[];
  dueCount: number;
  newCount: number;
}

/** Verbele pentru care există forme conjugate, cu timpurile disponibile. */
export function conjugationVerbs(content: ContentStore, conjugations: Conjugations): ConjVerb[] {
  return content.words
    .filter((w) => w.pos === "verb" && conjugations[w.id])
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
  const [settings, cards, reviewsDoneToday] = await Promise.all([
    getSettings(db),
    db.cards.toArray(),
    countReviewsOn(db, studyDayOf(now)),
  ]);
  const queue = buildConjugationSession({
    now,
    settings,
    cards,
    verbs: conjugationVerbs(content, conjugations),
    reviewsDoneToday,
  });
  const newCount = queue.filter((i) => i.isNew).length;
  return { settings, queue, dueCount: queue.length - newCount, newCount };
}

export async function loadQuizRound(
  db: ImparaDb,
  content: ContentStore,
  now: Date = new Date(),
): Promise<{ settings: Settings; questions: QuizQuestion[] }> {
  const [settings, cards] = await Promise.all([getSettings(db), db.cards.toArray()]);
  const questions = buildQuizRound({
    now,
    direction: settings.direction,
    cards,
    words: content.words,
  });
  return { settings, questions };
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

/** Runda de quiz doar cu cuvintele temei. */
export async function loadTopicQuiz(
  db: ImparaDb,
  content: ContentStore,
  topic: Topic,
  now: Date = new Date(),
): Promise<{ settings: Settings; questions: QuizQuestion[] }> {
  const [settings, cards] = await Promise.all([getSettings(db), db.cards.toArray()]);
  const topicWords = topicWordIds(topic).flatMap((id) => content.byId(id) ?? []);
  const questions = buildTopicQuizRound({
    now,
    direction: settings.direction,
    cards,
    topicWords,
    words: content.words,
  });
  return { settings, questions };
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

/** Cuvintele introduse (cu cel puțin un card de vocabular), în oricare direcție. */
async function knownWordIds(db: ImparaDb): Promise<Set<string>> {
  const cards = await db.cards.where("kind").equals("vocab").toArray();
  return new Set(cards.map((c) => c.wordId));
}

/** O rundă de propoziții de reconstruit, din cuvintele deja învățate. */
export async function loadSentenceRound(db: ImparaDb, sentences: readonly SentenceItem[]): Promise<SentenceItem[]> {
  return buildSentenceRound({ sentences, knownWordIds: await knownWordIds(db) });
}
