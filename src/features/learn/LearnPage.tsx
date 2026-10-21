import { useLiveQuery } from "dexie-react-hooks";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useConjugations } from "../../app/conjugations.ts";
import { useSentences } from "../../app/sentences.ts";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
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

const counts = (due: number, fresh: number, newLabel: string) =>
  due + fresh === 0 ? "Nimic de făcut acum" : `${due} repetiții · ${fresh} ${newLabel}`;

export function LearnPage() {
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
      <h1 className="text-2xl font-bold">Învață</h1>

      <Tile to="/learn/vocab" emoji="🃏" title="Flashcards">
        {vocab ? counts(vocab.dueCount, vocab.newCount, "cuvinte noi") : "Se încarcă…"}
      </Tile>

      <Tile to="/learn/conjugation" emoji="✍️" title="Conjugare">
        {conj
          ? conj.queue.length > 0
            ? counts(conj.dueCount, conj.newCount, "timpuri noi")
            : "Se deblochează după ce înveți verbe în Flashcards"
          : "Se încarcă…"}
      </Tile>

      <Tile
        to="/learn/sentence"
        emoji="🧩"
        title="Reconstruire propoziție"
        disabled={sentenceRound !== undefined && sentenceRound.length === 0}
      >
        {sentenceRound
          ? sentenceRound.length > 0
            ? "Ordonează cuvintele în italiană"
            : "Învață mai întâi câteva cuvinte"
          : "Se încarcă…"}
      </Tile>

      <Tile to="/learn/topics" emoji="🗂️" title="Teme">
        Zile, luni, numere, ora, direcții, culori, saluturi
      </Tile>

      <Tile to="/learn/games" emoji="🎲" title="Jocuri">
        Gramatică: articole, verbele essere și avere
      </Tile>

      <Tile to="/quiz" emoji="❓" title="Quiz" disabled={quiz !== undefined && quiz.questions.length === 0}>
        {quiz
          ? quiz.questions.length > 0
            ? `O rundă de ${quiz.questions.length} întrebări cu 4 variante`
            : "Învață mai întâi câteva cuvinte"
          : "Se încarcă…"}
      </Tile>
    </div>
  );
}
