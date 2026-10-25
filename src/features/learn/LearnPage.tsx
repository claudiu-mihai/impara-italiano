import { useLiveQuery } from "dexie-react-hooks";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useConjugations } from "../../app/conjugations.ts";
import { useSentences } from "../../app/sentences.ts";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { useT } from "../../i18n/index.ts";
import { loadConjugationOverview, loadQuizRound, loadSentenceRound, loadStudyOverview } from "../../data/queries.ts";

interface TileProps {
  to: string;
  emoji: string;
  title: string;
  children: ReactNode;
  disabled?: boolean;
}

function Tile({ to, emoji, title, children, disabled }: TileProps) {
  const body = (
    <>
      <span aria-hidden="true" className="text-3xl">
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted">{children}</span>
      </span>
    </>
  );
  const base = "flex min-h-20 items-center gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900";
  return disabled ? (
    <div className={`${base} opacity-60`}>{body}</div>
  ) : (
    <Link to={to} className={`${base} active:bg-slate-100 dark:active:bg-slate-800`}>
      {body}
    </Link>
  );
}

export function LearnPage() {
  const { t, tp } = useT();
  const counts = (due: number, fresh: number, newBase: "learn.newWords" | "learn.newTenses") =>
    due + fresh === 0 ? t("learn.nothingToDo") : `${tp("learn.due", due)} · ${tp(newBase, fresh)}`;
  const content = useContent();
  const conjugations = useConjugations();
  const vocab = useLiveQuery(() => loadStudyOverview(db, content), [content]);
  const conj = useLiveQuery(
    () => (conjugations ? loadConjugationOverview(db, content, conjugations) : undefined),
    [content, conjugations],
  );
  const quiz = useLiveQuery(() => loadQuizRound(db, content), [content]);
  const sentenceList = useSentences();
  const sentenceRound = useLiveQuery(
    () => (sentenceList ? loadSentenceRound(db, sentenceList) : undefined),
    [sentenceList],
  );

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-8">
      <h1 className="text-2xl font-bold">{t("learn.title")}</h1>

      <Tile to="/learn/vocab" emoji="🃏" title={t("learn.flashcards")}>
        {vocab ? counts(vocab.dueCount, vocab.newCount, "learn.newWords") : t("common.loading")}
      </Tile>

      <Tile to="/learn/conjugation" emoji="✍️" title={t("learn.conjugation")}>
        {conj
          ? conj.queue.length > 0
            ? counts(conj.dueCount, conj.newCount, "learn.newTenses")
            : t("learn.conjLocked")
          : t("common.loading")}
      </Tile>

      <Tile
        to="/learn/sentence"
        emoji="🧩"
        title={t("learn.sentence")}
        disabled={sentenceRound !== undefined && sentenceRound.length === 0}
      >
        {sentenceRound
          ? sentenceRound.length > 0
            ? t("learn.sentenceHint")
            : t("learn.learnWordsFirst")
          : t("common.loading")}
      </Tile>

      <Tile to="/learn/topics" emoji="🗂️" title={t("learn.topics")}>
        {t("learn.topicsHint")}
      </Tile>

      <Tile to="/learn/games" emoji="🎲" title={t("learn.games")}>
        {t("learn.gamesHint")}
      </Tile>

      <Tile to="/quiz" emoji="❓" title={t("learn.quiz")} disabled={quiz !== undefined && quiz.questions.length === 0}>
        {quiz
          ? quiz.questions.length > 0
            ? tp("learn.quizRound", quiz.questions.length)
            : t("learn.learnWordsFirst")
          : t("common.loading")}
      </Tile>
    </div>
  );
}
