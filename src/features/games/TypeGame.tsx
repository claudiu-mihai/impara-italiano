import { useMemo, useRef, useState, type FormEvent } from "react";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import type { GrammarItem } from "../../domain/content/schema.ts";
import type { AnswerResult } from "../../domain/grading/compareAnswer.ts";
import { gradeGap, pickSession } from "../../domain/grammar/games.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { playFeedback } from "../../services/sound.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { ACCENTS } from "../conjugation/types.ts";
import { GapText } from "./GapText.tsx";
import { useGrammarTopic } from "./useGrammarTopic.ts";

/** Introducere text: se scrie cuvântul care lipsește din expresie; traducerea română e indiciul. */
export function TypePage() {
  const { t } = useT();
  const { id, topic, loading } = useGrammarTopic();
  if (loading) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  if (!topic) {
    return <SessionDone emoji="🤔" title={t("topics.notFound")} text="" backTo="/learn/games" backLabel={t("games.backToList")} />;
  }
  return <TypeGame key={id} topicId={topic.id} items={topic.items} />;
}

function TypeGame({ topicId, items }: { topicId: string; items: GrammarItem[] }) {
  const { t } = useT();
  const exitTo = `/learn/games/${topicId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [attempt, setAttempt] = useState(0);
  const session = useMemo(
    () => pickSession(items),
    // o nouă încercare amestecă din nou
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, attempt],
  );
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AnswerResult>();

  const item = session[step];

  if (!item) {
    return (
      <SessionDone
        title={t("common.outOf", { n: score, total: session.length })}
        text={score === session.length ? t("type.allCorrect") : t("type.tryAgain")}
        backTo={exitTo}
        backLabel={t("flash.backToTopic")}
      >
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setAttempt((a) => a + 1);
            setStep(0);
            setScore(0);
            setInput("");
            setResult(undefined);
          }}
        >
          {t("common.anotherRound")}
        </button>
      </SessionDone>
    );
  }

  const insertAccent = (char: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    setInput(input.slice(0, start) + char + input.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1);
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!result) {
      const graded = gradeGap(input, item);
      setResult(graded);
      // doar răspunsul exact contează: „e” în loc de „è” nu e corect
      if (graded === "correct") setScore((s) => s + 1);
      playFeedback(graded === "correct", (await getSettings(db)).soundEnabled);
      return;
    }
    setStep((s) => s + 1);
    setInput("");
    setResult(undefined);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const tone = result === undefined ? "neutral" : result === "correct" ? "correct" : "wrong";

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={step} total={session.length} label={t("games.progress")} exitTo={exitTo} />

      <section className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">{t("type.complete")}</p>
        <p className="text-3xl font-bold" data-testid="grammar-prompt">
          <GapText it={item.it} gap={item.gap} filled={result ? item.gap : undefined} tone={tone} />
        </p>
        <p lang={NATIVE_LANGUAGE} className="text-muted">
          {item.ro}
        </p>
      </section>

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
        <div aria-live="polite" className="min-h-14">
          {result === "correct" && <p className="text-center font-semibold text-green-700 dark:text-green-400">{t("conj.correct")}</p>}
          {result === "almost" && (
            <p className="text-center font-semibold text-amber-700 dark:text-amber-400">
              {t("type.almost", { gap: item.gap })}
            </p>
          )}
          {result === "wrong" && (
            <p className="text-center font-semibold text-red-700 dark:text-red-400">{t("conj.correctAnswer", { form: item.gap })}</p>
          )}
          {result && (
            <div className="mt-1 flex items-center justify-center gap-2">
              {item.note && (
                <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
                  {item.note}
                </p>
              )}
              <AudioButton text={item.it} size="sm" />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          readOnly={result !== undefined}
          aria-label={t("type.missing")}
          placeholder={t("type.placeholder")}
          lang="it"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          className="min-h-14 rounded-xl border-2 border-slate-300 bg-white px-4 text-center text-xl dark:border-slate-700 dark:bg-slate-900"
        />

        <div className="flex justify-center gap-2" aria-label={t("conj.accents")}>
          {ACCENTS.map((char) => (
            <button
              key={char}
              type="button"
              disabled={result !== undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAccent(char)}
              className="size-12 rounded-lg bg-slate-200 text-xl disabled:opacity-40 dark:bg-slate-800"
            >
              {char}
            </button>
          ))}
        </div>

        <button type="submit" className={`${primaryButton} w-full`}>
          {!result ? t("conj.check") : step + 1 >= session.length ? t("common.seeResult") : t("common.continue")}
        </button>
      </form>
    </div>
  );
}
