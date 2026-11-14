import { buildQuizRound, buildTopicQuizRound, type QuizQuestion } from "../domain/quiz/buildQuizRound.ts";
import type { Topic } from "../domain/content/schema.ts";
import { buildSentenceRound, buildTopicSentenceRound, type SentenceItem, type SentenceQuestion } from "../domain/sentence/sentenceRound.ts";
import type { Settings } from "../domain/settings.ts";
import { topicWordIds } from "../domain/topics/topics.ts";
import type { ContentStore } from "./content/contentStore.ts";
import type { ImparaDb } from "./db/db.ts";
import { getSettings } from "./db/repositories.ts";

// Rundele de exerciții (quiz, propoziții), separat de queries.ts: le folosesc doar ecranele de exerciții, încărcate la
// cerere, deci codul lor nu intră în pachetul ecranului de start (testul de viteză din tests/e2e/perf.spec.ts).

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

/** Cuvintele introduse (cu cel puțin un card de vocabular), în oricare direcție. */
async function knownWordIds(db: ImparaDb): Promise<Set<string>> {
  const cards = await db.cards.where("kind").equals("vocab").toArray();
  return new Set(cards.map((c) => c.wordId));
}

/** O rundă de propoziții de reconstruit, din cuvintele deja învățate. */
export async function loadSentenceRound(db: ImparaDb, sentences: readonly SentenceItem[]): Promise<SentenceQuestion[]> {
  return buildSentenceRound({ sentences, knownWordIds: await knownWordIds(db) });
}

/** O rundă de propoziții dintr-o temă: întâi cele cu cuvinte din temă deja începute. */
export async function loadTopicSentenceRound(
  db: ImparaDb,
  sentences: readonly SentenceItem[],
  topic: Topic,
): Promise<SentenceQuestion[]> {
  return buildTopicSentenceRound({ sentences, topicWordIds: topicWordIds(topic), knownWordIds: await knownWordIds(db) });
}
