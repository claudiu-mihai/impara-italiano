import { Link } from "react-router-dom";
import { useGrammar } from "../../app/grammar.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";

export function GamesPage() {
  const { t } = useT();
  const topics = useGrammar();
  if (!topics) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn" label={t("nav.learn")} />
      <h1 className="text-2xl font-bold">{t("learn.games")}</h1>
      <p className="text-muted">{t("games.intro")}</p>

      <ol className="flex flex-col gap-2" aria-label={t("games.topicsList")}>
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              to={`/learn/games/${topic.id}`}
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
              <CefrBadge level={topic.level} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
