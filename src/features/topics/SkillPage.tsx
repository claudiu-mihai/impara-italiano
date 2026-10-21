import { useEffect, useRef, useState, type FormEvent } from "react";
import { db } from "../../data/db/instance.ts";
import { getSettings, saveReview } from "../../data/db/repositories.ts";
import { compareAnswer, type AnswerResult } from "../../domain/grading/compareAnswer.ts";
import { isDue } from "../../domain/session/buildDailySession.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { skillCardId } from "../../domain/srs/types.ts";
import { buildSkillRound, gradeSkill, type SkillItem } from "../../domain/skills/skills.ts";
import { formatNumber } from "../../domain/skills/numbers.ts";
import { formatDigital } from "../../domain/skills/time.ts";
import { endOfStudyDay, studyDayOf } from "../../domain/time/studyDay.ts";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import { playFeedback } from "../../services/sound.ts";
import { speak, useTtsStatus } from "../../services/tts.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { ClockFace } from "../../ui/ClockFace.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import type { Skill } from "../../domain/content/constants.ts";
import { useTopic } from "./useTopic.ts";

const ACCENTS = ["à", "è", "é", "ì", "ò", "ù"];

/** Numere (ascultă și scrie cifrele) și Ceasul: abilități cu itemi generați; unitatea SRS este abilitatea. */
export function SkillPage() {
  const { id, topic, loading } = useTopic();
  if (loading) return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  if (!topic?.skill) {
    return <SessionDone emoji="🤔" title="Exercițiul nu există" text="" backTo="/learn/topics" backLabel="Înapoi la teme" />;
  }
  return <SkillGame key={id} topicId={topic.id} skill={topic.skill} />;
}

interface Feedback {
  result: AnswerResult;
  expected: string;
}

function SkillGame({ topicId, skill }: { topicId: string; skill: Skill }) {
  const exitTo = `/learn/topics/${topicId}`;
  const tts = useTtsStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  /** Prima rundă dintr-o repetiție scadentă (sau abilitate nouă) se notează în SRS; următoarele sunt antrenament. */
  const [countsForSrs, setCountsForSrs] = useState(false);
  const [round, setRound] = useState(0);
  const [items, setItems] = useState<SkillItem[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [saved, setSaved] = useState(false);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [loaded, card] = await Promise.all([getSettings(db), db.cards.get(skillCardId(skill))]);
      if (!alive) return;
      const now = new Date();
      setSettings(loaded);
      setCountsForSrs(!card || isDue(card, now, endOfStudyDay(now)));
      setItems(buildSkillRound(skill));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [skill]);

  const item = items[index];

  // la un item nou: curăță răspunsul, pornește cronometrul și pronunță numărul (dacă e de ascultat)
  useEffect(() => {
    setInput("");
    setFeedback(undefined);
    shownAt.current = Date.now();
    if (item?.type === "listen-number" && tts === "ready") speak(item.spoken, settings.ttsRate);
    requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, round, items]);

  const finish = async (finalResults: AnswerResult[]) => {
    if (saved) return;
    setSaved(true);
    if (!countsForSrs) return;
    const now = new Date();
    const existing = await db.cards.get(skillCardId(skill));
    const card =
      existing ??
      newStoredCard({ cardId: skillCardId(skill), wordId: skill, kind: "skill", variant: "auto" }, now, studyDayOf(now));
    const { card: next, log } = reviewStoredCard(card, gradeSkill(finalResults), now, settings.retention);
    await saveReview(db, next, log, { source: "skill", now, durationMs: now.getTime() - shownAt.current });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;
    if (feedback) {
      // „Continuă”
      if (index + 1 >= items.length) void finish(results);
      setIndex((i) => i + 1);
      return;
    }
    if (item.type === "clock-pick") return;
    const result = compareAnswer(input, item.answers);
    setFeedback({ result, expected: item.answers[0]! });
    setResults((r) => [...r, result]);
    playFeedback(result !== "wrong", settings.soundEnabled);
  };

  const pick = (choice: number) => {
    if (!item || item.type !== "clock-pick" || feedback) return;
    const result: AnswerResult = choice === item.correctIndex ? "correct" : "wrong";
    setFeedback({ result, expected: item.phrase });
    setResults((r) => [...r, result]);
    playFeedback(result === "correct", settings.soundEnabled);
  };

  if (!ready) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  if (!item) {
    const right = results.filter((r) => r !== "wrong").length;
    return (
      <SessionDone
        title={`${right} din ${results.length}`}
        text={
          countsForSrs && round === 0
            ? "Repetiția a fost notată; abilitatea revine la timpul potrivit."
            : "Antrenament liber: nu schimbă programul de repetare."
        }
        backTo={exitTo}
        backLabel="Înapoi la temă"
      >
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setItems(buildSkillRound(skill));
            setIndex(0);
            setResults([]);
            setSaved(false);
            setRound((r) => r + 1);
            // doar prima rundă dintr-o repetiție scadentă se notează
            setCountsForSrs(false);
          }}
        >
          Încă o rundă
        </button>
      </SessionDone>
    );
  }

  const typed = item.type !== "clock-pick";
  const insertAccent = (char: string) => setInput((value) => value + char);

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={items.length} label="Progresul rundei" exitTo={exitTo} />
      {countsForSrs && round === 0 && <p className="text-center text-sm font-semibold text-brand-fg">Repetiție</p>}

      <section className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        {item.type === "listen-number" && (
          <>
            <p className="text-sm text-muted">Ascultă și scrie numărul cu cifre</p>
            {tts === "ready" ? (
              <AudioButton text={item.spoken} rate={settings.ttsRate} />
            ) : (
              // fără voce italiană: numărul se citește în loc să se asculte
              <p className="text-3xl font-bold" data-testid="spoken-text">
                {item.spoken}
              </p>
            )}
          </>
        )}
        {item.type === "write-number" && (
          <>
            <p className="text-sm text-muted">Scrie numărul cu litere</p>
            <p className="text-5xl font-bold" data-testid="digits">
              {formatNumber(item.n)}
            </p>
          </>
        )}
        {item.type === "clock-write" && (
          <>
            <p className="text-sm text-muted">Cât este ceasul? Scrie ora în italiană</p>
            <ClockFace time={item.time} />
          </>
        )}
        {item.type === "clock-pick" && (
          <>
            <p className="text-sm text-muted">Alege ceasul potrivit</p>
            <p className="text-2xl font-bold" data-testid="phrase">
              {item.phrase}
            </p>
          </>
        )}
      </section>

      {item.type === "clock-pick" ? (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Ceasuri">
          {item.options.map((option, i) => {
            const isCorrect = i === item.correctIndex;
            const state = !feedback
              ? "border-slate-200 active:bg-slate-100"
              : isCorrect
                ? "border-green-600 bg-green-100"
                : "border-slate-200 opacity-60";
            return (
              <button
                key={`${option.hour}:${option.minute}`}
                type="button"
                disabled={!!feedback}
                onClick={() => pick(i)}
                aria-label={`Ceasul ${formatDigital(option)}`}
                className={`flex min-h-14 items-center justify-center rounded-xl border-2 bg-white p-2 ${state}`}
              >
                <ClockFace time={option} size={110} label={`Ceas ${formatDigital(option)}`} />
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="sr-only" htmlFor="answer">
            Răspunsul tău
          </label>
          <input
            id="answer"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            readOnly={!!feedback}
            inputMode={item.type === "listen-number" ? "numeric" : "text"}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-14 rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-2xl dark:border-slate-600 dark:bg-slate-900"
          />
          {typed && item.type !== "listen-number" && (
            <div className="flex justify-center gap-2" role="group" aria-label="Litere cu accent">
              {ACCENTS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => insertAccent(char)}
                  className="size-12 rounded-lg bg-slate-100 text-xl dark:bg-slate-800"
                >
                  {char}
                </button>
              ))}
            </div>
          )}
          <button type="submit" className={`${primaryButton} w-full`}>
            {feedback ? (index + 1 < items.length ? "Continuă" : "Vezi rezultatul") : "Verifică"}
          </button>
        </form>
      )}

      {feedback && (
        <div className="flex flex-col items-center gap-3" aria-live="polite">
          <p
            className={`text-center text-lg font-semibold ${
              feedback.result === "wrong" ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
            }`}
          >
            {feedback.result === "correct" ? "Corect!" : feedback.result === "almost" ? "Aproape: verifică accentele." : "Nu chiar."}
          </p>
          <p className="text-center text-xl font-semibold" data-testid="expected">
            {feedback.expected}
          </p>
          {item.type === "clock-pick" && (
            <button
              type="button"
              className={`${primaryButton} w-full`}
              onClick={() => {
                if (index + 1 >= items.length) void finish(results);
                setIndex((i) => i + 1);
              }}
            >
              {index + 1 < items.length ? "Continuă" : "Vezi rezultatul"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
