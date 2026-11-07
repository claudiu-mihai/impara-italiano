import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db } from "../../data/db/instance.ts";
import { bestScore } from "../../domain/grammar/progress.ts";
import { useGrammar } from "../../app/grammar.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";

export function GrammarListPage() {
  const { t } = useT();
  const topics = useGrammar();
  const progress = useLiveQuery(async () => new Map((await db.grammarProgress.toArray()).map((p) => [p.topicId, p])));
  if (!topics) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn" label={t("nav.learn")} />
      <h1 className="text-2xl font-bold">{t("learn.grammar")}</h1>
      <p className="text-muted">{t("games.intro")}</p>

      <ol className="flex flex-col gap-2" aria-label={t("games.topicsList")}>
        {topics.map((topic) => {
          const own = progress?.get(topic.id);
          const best = bestScore(own);
          return (
            <li key={topic.id}>
              <Link
                to={`/learn/grammar/${topic.id}`}
                className="flex min-h-16 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white"
                >
                  {topic.order}
                </span>
                <span lang={NATIVE_LANGUAGE} className="flex-1 text-lg font-semibold">
                  {topic.title}
                </span>
                {best !== undefined && <span className="text-sm font-semibold text-muted">{best}%</span>}
                {own?.readAt !== undefined && (
                  <span
                    role="img"
                    aria-label={t("grammar.read")}
                    className="font-bold text-green-700 dark:text-green-400"
                  >
                    ✓
                  </span>
                )}
                <CefrBadge level={topic.level} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
