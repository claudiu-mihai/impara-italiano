import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { EXERCISE_LABEL, italianText } from "../../domain/content/display.ts";
import { topicProgress } from "../../domain/topics/topics.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";

const secondaryButton =
  "flex min-h-14 items-center justify-center rounded-xl border-2 border-brand px-6 text-lg font-semibold text-brand-fg active:bg-slate-100 dark:active:bg-slate-800";

export function TopicPage() {
  const { id = "" } = useParams();
  const content = useContent();
  const topics = useTopics();
  const cards = useLiveQuery(() => db.cards.where("kind").equals("vocab").toArray(), []);

  if (!topics || !cards) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  const topic = topics.find((t) => t.id === id);
  if (!topic) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">Tema nu există.</p>
        <Link to="/learn/topics" className="text-brand-fg underline">
          Înapoi la teme
        </Link>
      </div>
    );
  }

  const progress = topicProgress(topic, cards);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <Link to="/learn/topics" className="flex min-h-12 items-center text-brand-fg underline">
        ← Teme
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-3xl font-bold">{topic.title}</h1>
          <CefrBadge level={topic.level} />
        </div>
        <p className="text-muted" data-testid="topic-progress">
          {progress.started} din {progress.total} cuvinte începute · {progress.mastered} stăpânite
        </p>
      </header>

      <section aria-labelledby="rules" className="rounded-2xl bg-amber-50 p-5 text-amber-950 dark:bg-amber-950 dark:text-amber-50">
        <h2 id="rules" className="text-sm font-semibold uppercase tracking-wide">
          De reținut
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-2 pl-5">
          {topic.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link to={`/learn/topics/${topic.id}/flashcards`} className={primaryButton}>
          Studiază tema
        </Link>
        <Link to={`/learn/topics/${topic.id}/quiz`} className={secondaryButton}>
          Quiz
        </Link>
      </div>

      {topic.subgroups.map((sub) => (
        <section key={sub.title} aria-label={sub.title} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{sub.title}</h2>
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {sub.wordIds.map((wordId) => {
              const word = content.byId(wordId);
              if (!word) return null;
              const text = italianText(word);
              return (
                <li key={wordId} className="flex items-center gap-2">
                  <Link to={`/browse/${wordId}`} className="flex min-h-14 flex-1 flex-col justify-center">
                    <span className="text-lg font-semibold">{text}</span>
                    <span className="text-sm text-muted">{word.ro}</span>
                  </Link>
                  <AudioButton text={text} size="sm" />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {topic.exercises.length > 0 && (
        <section aria-labelledby="exercises" className="flex flex-col gap-3">
          <h2 id="exercises" className="text-sm font-semibold uppercase tracking-wide text-muted">
            Exerciții
          </h2>
          {topic.exercises.map((exercise) => (
            <Link key={exercise} to={`/learn/topics/${topic.id}/${exercise}`} className={secondaryButton}>
              {EXERCISE_LABEL[exercise]}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
