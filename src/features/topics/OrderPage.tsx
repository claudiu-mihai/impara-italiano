import { useMemo, useState } from "react";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { italianText } from "../../domain/content/display.ts";
import { shuffle } from "../../domain/random.ts";
import { buildFollowQuestions, isNextInSequence } from "../../domain/topics/exercises.ts";
import { useT } from "../../i18n/index.ts";
import { playFeedback } from "../../services/sound.ts";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { useTopic } from "./useTopic.ts";

/** Ordonează: aranjează elementele în ordine, apoi întrebări „Ce urmează după…?”. */
export function OrderPage() {
  const { t } = useT();
  const { id, topic, loading } = useTopic();
  if (loading) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  if (!topic?.sequence) {
    return <SessionDone emoji="🤔" title={t("topics.exerciseMissing")} text="" backTo="/learn/topics" backLabel={t("topics.backToList")} />;
  }
  return <OrderGame key={id} topicId={topic.id} sequence={topic.sequence} cyclic={topic.cyclic ?? false} />;
}

function OrderGame({ topicId, sequence, cyclic }: { topicId: string; sequence: string[]; cyclic: boolean }) {
  const { t, tp } = useT();
  const content = useContent();
  const exitTo = `/learn/topics/${topicId}`;
  const [attempt, setAttempt] = useState(0);
  const pool = useMemo(
    () => shuffle(sequence),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sequence.join(","), attempt],
  );
  const questions = useMemo(
    () => buildFollowQuestions(sequence, cyclic),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sequence.join(","), cyclic, attempt],
  );

  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string>();
  const [mistakes, setMistakes] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [score, setScore] = useState(0);

  const label = (wordId: string) => {
    const word = content.byId(wordId);
    return word ? italianText(word) : wordId;
  };
  const sound = async (correct: boolean) => playFeedback(correct, (await getSettings(db)).soundEnabled);

  const arranging = placed.length < sequence.length;

  const place = (wordId: string) => {
    if (isNextInSequence(sequence, placed, wordId)) {
      void sound(true);
      setPlaced([...placed, wordId]);
    } else {
      void sound(false);
      setMistakes((m) => m + 1);
      setWrongId(wordId);
      setTimeout(() => setWrongId(undefined), 500);
    }
  };

  const question = questions[qIndex];

  if (!arranging && !question) {
    return (
      <SessionDone
        title={t("common.outOf", { n: score, total: questions.length })}
        text={mistakes === 0 ? t("order.noMistakes") : tp("order.mistakes", mistakes)}
        backTo={exitTo}
        backLabel={t("flash.backToTopic")}
      >
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setAttempt((a) => a + 1);
            setPlaced([]);
            setMistakes(0);
            setQIndex(0);
            setSelected(undefined);
            setScore(0);
          }}
        >
          {t("match.again")}
        </button>
      </SessionDone>
    );
  }

  if (arranging) {
    const remaining = pool.filter((p) => !placed.includes(p));
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <StudyHeader index={placed.length} total={sequence.length} label={t("exercise.progress")} exitTo={exitTo} />
        <h1 className="text-center text-lg font-semibold">{t("order.title")}</h1>
        <ol className="flex min-h-16 flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900" aria-label={t("order.chosen")}>
          {placed.map((wordId, i) => (
            <li key={wordId} className="rounded-lg bg-green-100 px-3 py-2 text-green-950">
              {i + 1}. {label(wordId)}
            </li>
          ))}
          {placed.length === 0 && <li className="list-none text-muted">{t("order.pickFirst")}</li>}
        </ol>
        <div className="flex flex-wrap gap-3" role="group" aria-label={t("order.items")}>
          {remaining.map((wordId) => (
            <button
              key={wordId}
              type="button"
              onClick={() => place(wordId)}
              className={`min-h-14 rounded-xl border-2 px-4 text-lg ${
                wrongId === wordId
                  ? "border-red-600 bg-red-100 text-red-950"
                  : "border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {label(wordId)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const answered = selected !== undefined;
  const choose = (wordId: string) => {
    if (answered) return;
    setSelected(wordId);
    const correct = wordId === question!.correctId;
    void sound(correct);
    if (correct) setScore((s) => s + 1);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={qIndex} total={questions.length} label={t("order.questionProgress")} exitTo={exitTo} />
      <section className="rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">{t(question!.kind === "after" ? "order.after" : "order.before")}</p>
        <p className="text-3xl font-bold" data-testid="follow-prompt">
          {label(question!.fromId)}?
        </p>
      </section>
      <div className="flex flex-col gap-3" role="group" aria-label={t("quiz.options")}>
        {question!.optionIds.map((optionId) => {
          const isCorrect = optionId === question!.correctId;
          const state = !answered
            ? "border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
            : isCorrect
              ? "border-green-600 bg-green-100 text-green-950"
              : optionId === selected
                ? "border-red-600 bg-red-100 text-red-950"
                : "border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900";
          return (
            <button
              key={optionId}
              type="button"
              disabled={answered}
              onClick={() => choose(optionId)}
              className={`min-h-14 rounded-xl border-2 px-4 text-left text-lg ${state}`}
            >
              {label(optionId)}
              {answered && isCorrect && <span className="sr-only">{t("quiz.srCorrect")}</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-auto flex flex-col gap-3" aria-live="polite">
          <p className="text-center font-semibold">{selected === question!.correctId ? t("conj.correct") : t("quiz.notQuite")}</p>
          <button
            type="button"
            className={`${primaryButton} w-full`}
            onClick={() => {
              setSelected(undefined);
              setQIndex((i) => i + 1);
            }}
          >
            {qIndex + 1 < questions.length ? t("common.continue") : t("common.seeResult")}
          </button>
        </div>
      )}
    </div>
  );
}
