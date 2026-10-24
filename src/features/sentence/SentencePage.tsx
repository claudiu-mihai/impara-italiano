import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSentences } from "../../app/sentences.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { loadSentenceRound } from "../../data/queries.ts";
import {
  isCorrectArrangement,
  scrambleOrder,
  sentenceText,
  type SentenceItem,
} from "../../domain/sentence/sentenceRound.ts";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import { playFeedback } from "../../services/sound.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { LupinoFill } from "../../ui/mascot/Lupino.tsx";

const block =
  "min-h-12 rounded-lg border-2 border-slate-300 bg-white px-4 text-lg font-medium active:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800";

export function SentencePage() {
  const sentences = useSentences();
  const [round, setRound] = useState(0);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<SentenceItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Starea întrebării curente: ordinea amestecată a blocurilor și blocurile puse în răspuns.
  const [order, setOrder] = useState<number[]>([]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (!sentences) return;
    let alive = true;
    setReady(false);
    void Promise.all([getSettings(db), loadSentenceRound(db, sentences)]).then(([loadedSettings, loaded]) => {
      if (!alive) return;
      setSettings(loadedSettings);
      setQuestions(loaded);
      setIndex(0);
      setScore(0);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [sentences, round]);

  const question = questions[index];

  useEffect(() => {
    setOrder(question ? scrambleOrder(question) : []);
    setPlaced([]);
    setResult(null);
  }, [question?.id, index]);

  if (!ready) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  if (questions.length === 0) {
    return (
      <SessionDone
        emoji="🧩"
        title="Încă nu ai propoziții de construit"
        text="Propozițiile apar după ce înveți câteva cuvinte în Flashcards."
      >
        <Link to="/learn/vocab" className={primaryButton}>
          Mergi la Flashcards
        </Link>
      </SessionDone>
    );
  }

  if (!question) {
    return (
      <SessionDone
        title={`${score} din ${questions.length}`}
        text={score === questions.length ? "Perfect!" : "Mai încearcă o rundă ca să te obișnuiești cu ordinea cuvintelor."}
      >
        <button type="button" onClick={() => setRound((r) => r + 1)} className={primaryButton}>
          Încă o rundă
        </button>
      </SessionDone>
    );
  }

  const bank = order.filter((i) => !placed.includes(i));
  const complete = placed.length === question.tokens.length;

  const check = () => {
    const correct = isCorrectArrangement(question, placed);
    setResult(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
    playFeedback(correct, settings.soundEnabled);
  };

  const next = () => setIndex((i) => i + 1);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={questions.length} label="Progresul rundei" />

      <section className="rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">Scrie în italiană:</p>
        <p className="mt-2 text-2xl font-bold">{question.ro}</p>
      </section>

      <div
        aria-label="Răspunsul tău"
        className={`flex min-h-24 flex-wrap content-start items-center gap-2 rounded-2xl border-2 border-dashed p-3 ${
          result === "correct"
            ? "border-green-600 bg-green-50 dark:bg-green-950"
            : result === "wrong"
              ? "border-red-600 bg-red-50 dark:bg-red-950"
              : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {placed.length === 0 && <span className="text-muted">Atinge cuvintele de mai jos, în ordine.</span>}
        {placed.map((i) => (
          <button
            key={i}
            type="button"
            disabled={result !== null}
            onClick={() => setPlaced((p) => p.filter((x) => x !== i))}
            aria-label={`${question.tokens[i]} (scoate din răspuns)`}
            className={block}
          >
            {question.tokens[i]}
          </button>
        ))}
        {placed.length > 0 && <span className="text-lg font-medium">{question.punctuation}</span>}
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Cuvinte disponibile">
        {bank.map((i) => (
          <button
            key={i}
            type="button"
            disabled={result !== null}
            onClick={() => setPlaced((p) => [...p, i])}
            className={block}
          >
            {question.tokens[i]}
          </button>
        ))}
      </div>

      {/* ca în Quiz: Lupino reacționează la răspuns și ocupă cea mai mare parte din spațiul liber */}
      {result !== null && (
        <LupinoFill
          key={index}
          pose={result === "correct" ? "bravo" : "pensa"}
          ratio={0.8}
          max={420}
          className="lupino-react"
        />
      )}

      <div className="mt-auto flex flex-col gap-3" aria-live="polite">
        {result === "correct" && <p className="text-center font-semibold text-green-700 dark:text-green-400">Corect!</p>}
        {result === "wrong" && (
          <div className="text-center">
            <p className="font-semibold text-red-700 dark:text-red-400">Nu chiar. Varianta corectă:</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-lg">
              {sentenceText(question)}
              <AudioButton text={sentenceText(question)} rate={settings.ttsRate} size="sm" />
            </p>
          </div>
        )}
        {result === "correct" && (
          <div className="flex justify-center">
            <AudioButton text={sentenceText(question, placed)} rate={settings.ttsRate} size="sm" />
          </div>
        )}

        {result === null ? (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={placed.length === 0}
              onClick={() => setPlaced([])}
              className="min-h-14 rounded-xl border-2 border-slate-300 px-5 font-semibold disabled:opacity-40 dark:border-slate-600"
            >
              Reia
            </button>
            <button type="button" disabled={!complete} onClick={check} className={`${primaryButton} flex-1 disabled:opacity-40`}>
              Verifică
            </button>
          </div>
        ) : (
          <button type="button" onClick={next} className={`${primaryButton} w-full`}>
            {index + 1 < questions.length ? "Continuă" : "Vezi rezultatul"}
          </button>
        )}
      </div>
    </div>
  );
}
