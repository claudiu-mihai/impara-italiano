import { useLiveQuery } from "dexie-react-hooks";
import { Link, useLocation } from "react-router-dom";
import { markLessonRead } from "../../data/db/repositories.ts";
import { db } from "../../data/db/instance.ts";
import type { GrammarGame } from "../../domain/grammar/progress.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT, type Key } from "../../i18n/index.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { RulesBox } from "../../ui/RulesBox.tsx";
import { Lesson } from "./Lesson.tsx";
import type { LessonOrigin } from "./LessonLink.tsx";
import { useGrammarTopic } from "./useGrammarTopic.ts";

const GAMES: { path: string; icon: string; title: Key; text: Key; scored?: GrammarGame }[] = [
  { path: "cards", icon: "🃏", title: "games.cards", text: "games.cardsText" },
  { path: "match", icon: "🔗", title: "games.match", text: "games.matchText", scored: "match" },
  { path: "type", icon: "⌨️", title: "games.type", text: "games.typeText", scored: "type" },
];

export function GrammarTopicPage() {
  const { t } = useT();
  const { id, topic, loading } = useGrammarTopic();
  const progress = useLiveQuery(() => db.grammarProgress.get(id), [id]);
  // deschisă dintr-un link (fișa cuvântului, conjugare): „Înapoi” duce acolo
  const from = (useLocation().state as { from?: LessonOrigin } | null)?.from;
  if (loading) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  if (!topic) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t("topics.notFound")}.</p>
        <Link to="/learn/grammar" className="text-brand-fg underline">
          {t("games.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to={from?.path ?? "/learn/grammar"} label={from?.label ?? t("learn.grammar")} />

      <header className="flex items-center gap-3">
        <h1 lang={NATIVE_LANGUAGE} className="flex-1 text-3xl font-bold">
          {topic.title}
        </h1>
        <CefrBadge level={topic.level} />
      </header>

      {topic.lesson && <Lesson blocks={topic.lesson} />}

      <RulesBox rules={topic.rules} lang={NATIVE_LANGUAGE} defaultOpen />

      {/* citirea nu se poate anula (pe alt dispozitiv ar reveni la sincronizare), deci după apăsare rămâne doar starea */}
      {progress?.readAt !== undefined ? (
        <p
          role="status"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-green-100 px-5 text-lg font-semibold text-green-950 dark:bg-green-950 dark:text-green-50"
        >
          ✓ {t("grammar.read")}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void markLessonRead(db, topic.id, new Date())}
          className="min-h-14 rounded-2xl bg-brand px-5 text-lg font-semibold text-white active:bg-brand-fg"
        >
          {t("grammar.markRead")}
        </button>
      )}

      <section aria-labelledby="games" className="flex flex-col gap-3">
        <h2 id="games" className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t("games.choose")}
        </h2>
        {GAMES.map((game) => (
          <Link
            key={game.path}
            to={`/learn/grammar/${topic.id}/${game.path}`}
            className="flex min-h-16 items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-100 dark:bg-slate-900 dark:active:bg-slate-800"
          >
            <span aria-hidden="true" className="text-3xl">
              {game.icon}
            </span>
            <span className="flex-1">
              <span className="block text-lg font-semibold">{t(game.title)}</span>
              <span className="block text-sm text-muted">{t(game.text)}</span>
              {game.scored && progress?.best[game.scored] !== undefined && (
                <span className="block text-sm font-semibold text-brand-fg">
                  {t("grammar.best", { n: progress.best[game.scored]! })}
                </span>
              )}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
