import { Link } from "react-router-dom";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT, type Key } from "../../i18n/index.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { RulesBox } from "../../ui/RulesBox.tsx";
import { useGrammarTopic } from "./useGrammarTopic.ts";

const GAMES: { path: string; icon: string; title: Key; text: Key }[] = [
  { path: "cards", icon: "🃏", title: "games.cards", text: "games.cardsText" },
  { path: "match", icon: "🔗", title: "games.match", text: "games.matchText" },
  { path: "type", icon: "⌨️", title: "games.type", text: "games.typeText" },
];

export function GameMenuPage() {
  const { t } = useT();
  const { topic, loading } = useGrammarTopic();
  if (loading) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  if (!topic) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t("topics.notFound")}.</p>
        <Link to="/learn/games" className="text-brand-fg underline">
          {t("games.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to="/learn/games" label={t("learn.games")} />

      <header className="flex items-center gap-3">
        <h1 lang={NATIVE_LANGUAGE} className="flex-1 text-3xl font-bold">
          {topic.title}
        </h1>
        <CefrBadge level={topic.level} />
      </header>

      <RulesBox rules={topic.rules} lang={NATIVE_LANGUAGE} />

      <section aria-labelledby="games" className="flex flex-col gap-3">
        <h2 id="games" className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t("games.choose")}
        </h2>
        {GAMES.map((game) => (
          <Link
            key={game.path}
            to={`/learn/games/${topic.id}/${game.path}`}
            className="flex min-h-16 items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
          >
            <span aria-hidden="true" className="text-3xl">
              {game.icon}
            </span>
            <span className="flex-1">
              <span className="block text-lg font-semibold">{t(game.title)}</span>
              <span className="block text-sm text-muted">{t(game.text)}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
