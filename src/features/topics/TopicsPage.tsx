import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { TOPIC_GROUPS } from "../../domain/content/constants.ts";
import { TOPIC_GROUP_LABEL } from "../../domain/content/display.ts";
import { topicProgress } from "../../domain/topics/topics.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { BilingualLabel } from "../../ui/BilingualLabel.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { ItalianFirstNotice } from "../../ui/ItalianFirstNotice.tsx";

export function TopicsPage() {
  const topics = useTopics();
  const cards = useLiveQuery(() => db.cards.where("kind").equals("vocab").toArray(), []);

  if (!topics || !cards) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn" label="Învață" />
      <h1 className="text-2xl font-bold">Teme</h1>
      <ItalianFirstNotice />
      <p className="text-muted">
        Cuvinte uzuale grupate pe subiecte, într-o ordine firească (luni → duminică), cu reguli scurte și exerciții.
      </p>

      {TOPIC_GROUPS.map((group) => {
        const inGroup = topics.filter((t) => t.group === group);
        if (inGroup.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`group-${group}`} className="flex flex-col gap-2">
            <h2 id={`group-${group}`} className="text-sm font-semibold uppercase tracking-wide text-muted">
              <BilingualLabel text={TOPIC_GROUP_LABEL[group]} />
            </h2>
            {inGroup.map((topic) => {
              const progress = topicProgress(topic, cards);
              return (
                <Link
                  key={topic.id}
                  to={`/learn/topics/${topic.id}`}
                  className="flex min-h-16 flex-col justify-center gap-1 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 text-lg font-semibold">
                      <BilingualLabel text={topic.title} />
                    </span>
                    <CefrBadge level={topic.level} />
                  </span>
                  <span className="text-sm text-muted">
                    {progress.started} din {progress.total} începute · {progress.mastered} stăpânite
                  </span>
                </Link>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
