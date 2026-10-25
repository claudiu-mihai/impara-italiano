import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { useContent } from "../../app/content.tsx";
import { useItalianFirst } from "../../app/italianFirst.ts";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { EXERCISE_ICON, EXERCISE_LABEL, italianText } from "../../domain/content/display.ts";
import { topicProgress } from "../../domain/topics/topics.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { BilingualLabel, plainLabel } from "../../ui/BilingualLabel.tsx";
import { TopicRulesBox } from "../../ui/TopicRulesBox.tsx";

// Toate acțiunile (Studiază, Quiz, exerciții) stau într-o grilă cu două coloane: padding mic, ca să încapă pe ecrane înguste.
// Studiază și Quiz stau pe un rând; exercițiile, cu etichete mai lungi, ocupă fiecare toată lățimea.
const action = "flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-center font-semibold";
const filled = `${action} bg-brand text-lg text-white active:bg-brand-dark`;
const outlined = `${action} border-2 border-brand text-brand-fg active:bg-slate-100 dark:active:bg-slate-800`;

export function TopicPage() {
  const { id = "" } = useParams();
  const content = useContent();
  const topics = useTopics();
  const cards = useLiveQuery(() => db.cards.where("kind").equals("vocab").toArray(), []);
  const italianFirst = useItalianFirst();

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
      <BackLink to="/learn/topics" label="Teme" />

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-3xl font-bold">
            <BilingualLabel text={topic.title} />
          </h1>
          <CefrBadge level={topic.level} />
        </div>
        <p className="text-muted" data-testid="topic-progress">
          {progress.started} din {progress.total} cuvinte începute · {progress.mastered} stăpânite
        </p>
      </header>

      {topic.subgroups.map((sub) => (
        <section key={sub.title.it} aria-label={plainLabel(sub.title, italianFirst)} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            <BilingualLabel text={sub.title} />
          </h2>
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

      <TopicRulesBox rules={topic.rules} contrast={topic.contrast?.ro} />

      <div className="grid grid-cols-2 gap-3" data-testid="topic-actions">
        <Link to={`/learn/topics/${topic.id}/flashcards`} className={`${filled} whitespace-nowrap`}>
          <span aria-hidden="true">📖</span>
          Studiază
        </Link>
        <Link to={`/learn/topics/${topic.id}/quiz`} className={`${outlined} whitespace-nowrap text-lg`}>
          <span aria-hidden="true">❓</span>
          Quiz
        </Link>
        {topic.exercises.map((exercise) => (
          <Link key={exercise} to={`/learn/topics/${topic.id}/${exercise}`} className={`${outlined} col-span-2 text-lg`}>
            <span aria-hidden="true">{EXERCISE_ICON[exercise]}</span>
            {EXERCISE_LABEL[exercise]}
          </Link>
        ))}
      </div>
    </div>
  );
}
