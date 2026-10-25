import { useRef, useState, type FormEvent } from "react";
import { personsOf, TENSE_LABEL } from "../../domain/content/display.ts";
import { spokenConjugation } from "../../domain/content/spokenConjugation.ts";
import { compareAnswer, type AnswerResult } from "../../domain/grading/compareAnswer.ts";
import { gradeConjugation, PERSONS_PER_REVIEW } from "../../domain/grading/gradeConjugation.ts";
import { shuffle } from "../../domain/random.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { playFeedback } from "../../services/sound.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";
import { ACCENTS, type ConjCardProps } from "./types.ts";

interface Feedback {
  result: AnswerResult;
  expected: string[];
}

/** Varianta „Scrie răspunsul”: 3 persoane pe rând, notă automată. */
export function WriteCard({ item, verb, forms, settings, onFinish }: ConjCardProps) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [persons] = useState(() =>
    shuffle(Array.from({ length: forms.length }, (_, i) => i)).slice(0, PERSONS_PER_REVIEW),
  );
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const person = persons[step]!;
  const personLabel = personsOf(item.tense)[person]!;
  const accepted = forms[person] ?? [];
  const lastStep = step + 1 >= persons.length;

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

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!feedback) {
      const result = compareAnswer(input, accepted);
      setFeedback({ result, expected: accepted });
      setResults((r) => [...r, result]);
      playFeedback(result !== "wrong", settings.soundEnabled);
      return;
    }
    if (!lastStep) {
      setStep(step + 1);
      setInput("");
      setFeedback(null);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    onFinish(gradeConjugation(results));
  };

  return (
    <>
      <section className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">{t(TENSE_LABEL[item.tense])}</p>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold">{verb.it}</p>
          <AudioButton text={verb.it} rate={settings.ttsRate} size="sm" />
        </div>
        <p lang={NATIVE_LANGUAGE} className="text-muted">
          {verb.ro}
        </p>
        <p className="mt-3 text-4xl font-bold text-brand-fg" data-testid="person">
          {personLabel.it}
        </p>
        {personLabel.ro !== personLabel.it && (
          <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
            ({personLabel.ro})
          </p>
        )}
        <ol className="mt-2 flex gap-2" aria-label={t("conj.personOf", { n: step + 1, total: persons.length })}>
          {persons.map((p, i) => (
            <li
              key={p}
              aria-hidden="true"
              className={`size-2.5 rounded-full ${
                i < results.length
                  ? results[i] === "wrong"
                    ? "bg-red-500"
                    : results[i] === "almost"
                      ? "bg-amber-500"
                      : "bg-green-600"
                  : i === step
                    ? "bg-slate-500"
                    : "bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </ol>
      </section>

      <form onSubmit={onSubmit} className="mt-auto flex flex-col gap-3">
        <div aria-live="polite" className="min-h-14">
          {feedback?.result === "correct" && <p className="text-center font-semibold text-green-700 dark:text-green-400">{t("conj.correct")}</p>}
          {feedback?.result === "almost" && (
            <p className="text-center font-semibold text-amber-700 dark:text-amber-400">
              {t("conj.almostAccents", { form: feedback.expected[0] ?? "" })}
            </p>
          )}
          {feedback?.result === "wrong" && (
            <p className="text-center font-semibold text-red-700 dark:text-red-400">
              {t("conj.correctAnswer", { form: feedback.expected.join(" / ") })}
            </p>
          )}
          {feedback && (
            <div className="mt-1 flex justify-center gap-2">
              <AudioButton text={spokenConjugation(item.tense, person, feedback.expected)} rate={settings.ttsRate} size="sm" />
              <AudioButton text={spokenConjugation(item.tense, person, feedback.expected)} size="sm" slow />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          readOnly={feedback !== null}
          aria-label={t("conj.formFor", { person: personLabel.it })}
          placeholder={t("conj.placeholder")}
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
              disabled={feedback !== null}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAccent(char)}
              className="size-12 rounded-lg bg-slate-200 text-xl disabled:opacity-40 dark:bg-slate-800"
            >
              {char}
            </button>
          ))}
        </div>

        <button type="submit" className={`${primaryButton} w-full`}>
          {!feedback ? t("conj.check") : lastStep ? t("conj.finishCard") : t("common.continue")}
        </button>
      </form>
    </>
  );
}
