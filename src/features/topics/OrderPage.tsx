import { useMemo, useState } from "react";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { italianText } from "../../domain/content/display.ts";
import { shuffle } from "../../domain/random.ts";
import { buildFollowQuestions, isNextInSequence } from "../../domain/topics/exercises.ts";
import { playFeedback } from "../../services/sound.ts";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { useTopic } from "./useTopic.ts";

/** Ordonează: aranjează elementele în ordine, apoi întrebări „Ce urmează după…?”. */
export function OrderPage() {
  const { id, topic, loading } = useTopic();
  if (loading) return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  if (!topic?.sequence) {
    return <SessionDone emoji="🤔" title="Exercițiul nu există" text="" backTo="/learn/topics" backLabel="Înapoi la teme" />;
  }
  return <OrderGame key={id} topicId={topic.id} sequence={topic.sequence} cyclic={topic.cyclic ?? false} />;
}

function OrderGame({ topicId, sequence, cyclic }: { topicId: string; sequence: string[]; cyclic: boolean }) {
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

  const text = (wordId: string) => {
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
        title={`${score} din ${questions.length}`}
        text={mistakes === 0 ? "Ai ordonat totul fără greșeli." : `La ordonare ai greșit de ${mistakes} ${mistakes === 1 ? "dată" : "ori"}.`}
        backTo={exitTo}
        backLabel="Înapoi la temă"
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
          Încă o dată
        </button>
      </SessionDone>
    );
  }

  if (arranging) {
    const remaining = pool.filter((p) => !placed.includes(p));
    return (
      <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <StudyHeader index={placed.length} total={sequence.length} label="Progresul exercițiului" exitTo={exitTo} />
        <h1 className="text-center text-lg font-semibold">Pune elementele în ordine</h1>
        <ol className="flex min-h-16 flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900" aria-label="Ordinea aleasă">
          {placed.map((wordId, i) => (
            <li key={wordId} className="rounded-lg bg-green-100 px-3 py-2 text-green-950">
              {i + 1}. {text(wordId)}
            </li>
          ))}
          {placed.length === 0 && <li className="list-none text-muted">Alege primul element…</li>}
        </ol>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Elemente de ordonat">
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
              {text(wordId)}
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
      <StudyHeader index={qIndex} total={questions.length} label="Progresul întrebărilor" exitTo={exitTo} />
      <section className="rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">{question!.kind === "after" ? "Ce urmează după" : "Ce era înainte de"}</p>
        <p className="text-3xl font-bold" data-testid="follow-prompt">
          {text(question!.fromId)}?
        </p>
      </section>
      <div className="flex flex-col gap-3" role="group" aria-label="Variante de răspuns">
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
              {text(optionId)}
              {answered && isCorrect && <span className="sr-only"> (răspuns corect)</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-auto flex flex-col gap-3" aria-live="polite">
          <p className="text-center font-semibold">{selected === question!.correctId ? "Corect!" : "Nu chiar."}</p>
          <button
            type="button"
            className={`${primaryButton} w-full`}
            onClick={() => {
              setSelected(undefined);
              setQIndex((i) => i + 1);
            }}
          >
            {qIndex + 1 < questions.length ? "Continuă" : "Vezi rezultatul"}
          </button>
        </div>
      )}
    </div>
  );
}
