import { useMemo, useRef, useState, type FormEvent } from "react";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { compareAnswer } from "../../domain/grading/compareAnswer.ts";
import { buildCatRound } from "../../domain/topics/cat.ts";
import { playFeedback } from "../../services/sound.ts";
import { CatScene } from "../../ui/CatScene.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { useTopic } from "./useTopic.ts";

/** Unde e pisica?: scenă SVG → se alege sau se scrie prepoziția (sotto il tavolo, dentro la scatola). */
export function CatPage() {
  const { id, topic, loading } = useTopic();
  if (loading) return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  if (!topic) return <SessionDone emoji="🤔" title="Tema nu există" text="" backTo="/learn/topics" backLabel="Înapoi la teme" />;
  return <CatGame key={id} topicId={topic.id} />;
}

function CatGame({ topicId }: { topicId: string }) {
  const exitTo = `/learn/topics/${topicId}`;
  const [attempt, setAttempt] = useState(0);
  const questions = useMemo(
    () => buildCatRound(),
    // o nouă rundă amestecă din nou
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempt],
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "almost" | "wrong">();
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const question = questions[index];
  const answered = result !== undefined;

  const grade = async (value: "correct" | "almost" | "wrong") => {
    setResult(value);
    if (value !== "wrong") setScore((s) => s + 1);
    playFeedback(value !== "wrong", (await getSettings(db)).soundEnabled);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setSelected(undefined);
    setInput("");
    setResult(undefined);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (!question) {
    return (
      <SessionDone title={`${score} din ${questions.length}`} text={score === questions.length ? "Perfect!" : "Mai încearcă o rundă."} backTo={exitTo} backLabel="Înapoi la temă">
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setAttempt((a) => a + 1);
            setIndex(0);
            setScore(0);
            setSelected(undefined);
            setInput("");
            setResult(undefined);
          }}
        >
          Încă o rundă
        </button>
      </SessionDone>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (answered) {
      next();
      return;
    }
    void grade(compareAnswer(input, [question.item.answer, ...question.item.alternatives]));
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={questions.length} label="Progresul rundei" exitTo={exitTo} />
      <h1 className="text-center text-xl font-semibold">Unde e pisica?</h1>
      <div className="flex justify-center">
        <CatScene item={question.item} />
      </div>

      {question.mode === "choose" ? (
        <div className="flex flex-col gap-3" role="group" aria-label="Variante de răspuns">
          {question.options.map((option) => {
            const isCorrect = option === question.item.answer;
            const state = !answered
              ? "border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
              : isCorrect
                ? "border-green-600 bg-green-100 text-green-950"
                : option === selected
                  ? "border-red-600 bg-red-100 text-red-950"
                  : "border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900";
            return (
              <button
                key={option}
                type="button"
                disabled={answered}
                onClick={() => {
                  setSelected(option);
                  void grade(isCorrect ? "correct" : "wrong");
                }}
                className={`min-h-14 rounded-xl border-2 px-4 text-left text-lg ${state}`}
              >
                {option}
                {answered && isCorrect && <span className="sr-only"> (răspuns corect)</span>}
              </button>
            );
          })}
          {answered && (
            <button type="button" className={`${primaryButton} w-full`} onClick={next}>
              {index + 1 < questions.length ? "Continuă" : "Vezi rezultatul"}
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="cat-answer" className="text-center text-sm text-muted">
            Scrie unde e pisica (ex. «sotto il tavolo»)
          </label>
          <input
            id="cat-answer"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            readOnly={answered}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-14 rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-xl dark:border-slate-600 dark:bg-slate-900"
          />
          <button type="submit" className={`${primaryButton} w-full`}>
            {answered ? (index + 1 < questions.length ? "Continuă" : "Vezi rezultatul") : "Verifică"}
          </button>
        </form>
      )}

      {answered && (
        <p className="text-center text-lg font-semibold" aria-live="polite" data-testid="cat-feedback">
          {result === "wrong" ? "Nu chiar: " : "Corect: "}
          {question.item.answer}
        </p>
      )}
    </div>
  );
}
