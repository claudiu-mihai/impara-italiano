import { useRef, useState, type FormEvent } from "react";
import { personsOf, TENSE_LABEL } from "../../domain/content/display.ts";
import { spokenConjugation } from "../../domain/content/spokenConjugation.ts";
import { compareAnswer, type AnswerResult } from "../../domain/grading/compareAnswer.ts";
import { gradeConjugationTable } from "../../domain/grading/gradeConjugation.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { playFeedback } from "../../services/sound.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";
import { ACCENTS, type ConjCardProps } from "./types.ts";

/** Varianta „Tabel”: toate persoanele deodată; nota rezultă din câte forme sunt corecte. */
export function TableCard({ item, verb, forms, settings, onFinish }: ConjCardProps) {
  const { t } = useT();
  const persons = personsOf(item.tense);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [values, setValues] = useState<string[]>(() => forms.map(() => ""));
  const [focused, setFocused] = useState(0);
  const [results, setResults] = useState<AnswerResult[] | null>(null);

  const checked = results !== null;

  const insertAccent = (char: string) => {
    const el = refs.current[focused];
    const current = values[focused] ?? "";
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setValues(values.map((v, i) => (i === focused ? current.slice(0, start) + char + current.slice(end) : v)));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1);
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (results) {
      onFinish(gradeConjugationTable(results));
      return;
    }
    const graded = forms.map((accepted, i) => compareAnswer(values[i] ?? "", accepted));
    setResults(graded);
    playFeedback(graded.every((r) => r !== "wrong"), settings.soundEnabled);
  };

  const onEnter = (event: React.KeyboardEvent, i: number) => {
    // Enter trece la câmpul următor; la ultimul, verifică tot tabelul
    if (event.key !== "Enter" || checked) return;
    if (i + 1 < forms.length) {
      event.preventDefault();
      refs.current[i + 1]?.focus();
    }
  };

  const right = results?.filter((r) => r !== "wrong").length ?? 0;

  return (
    <>
      <section className="flex flex-col items-center gap-1 rounded-3xl bg-white p-5 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">{t(TENSE_LABEL[item.tense])}</p>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold">{verb.it}</p>
          <AudioButton text={verb.it} rate={settings.ttsRate} size="sm" />
        </div>
        <p lang={NATIVE_LANGUAGE} className="text-muted">
          {verb.ro}
        </p>
      </section>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-3">
        <ul className="flex flex-col gap-2" data-testid="conj-table">
          {persons.map((person, i) => {
            const result = results?.[i];
            const tone =
              result === undefined
                ? "border-slate-300 dark:border-slate-700"
                : result === "wrong"
                  ? "border-red-600 bg-red-50 dark:bg-red-950"
                  : result === "almost"
                    ? "border-amber-600 bg-amber-50 dark:bg-amber-950"
                    : "border-green-600 bg-green-50 dark:bg-green-950";
            return (
              <li key={person.it} className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <label htmlFor={`form-${i}`} className="w-20 shrink-0 text-lg font-semibold text-brand-fg">
                    {person.it}
                  </label>
                  <input
                    id={`form-${i}`}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    value={values[i] ?? ""}
                    onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))}
                    onFocus={() => setFocused(i)}
                    onKeyDown={(e) => onEnter(e, i)}
                    readOnly={checked}
                    lang="it"
                    autoFocus={i === 0}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    enterKeyHint={i + 1 < forms.length ? "next" : "done"}
                    className={`min-h-12 min-w-0 flex-1 rounded-xl border-2 bg-white px-3 text-lg dark:bg-slate-900 ${tone}`}
                  />
                </div>
                {result && result !== "correct" && (
                  <p className="ml-[5.75rem] text-sm font-semibold text-red-700 dark:text-red-400" data-testid="expected">
                    {t(result === "almost" ? "conj.almostShort" : "conj.correctShort", { form: (forms[i] ?? []).join(" / ") })}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {checked && (
          <div className="flex flex-col items-center gap-2" aria-live="polite">
            <p className="text-center text-lg font-semibold" data-testid="table-score">
              {t("conj.score", { n: right, total: forms.length })}
            </p>
            <div className="flex gap-2">
              <AudioButton text={persons.map((_, i) => spokenConjugation(item.tense, i, forms[i] ?? [])).join(". ")} rate={settings.ttsRate} size="sm" />
              <AudioButton text={persons.map((_, i) => spokenConjugation(item.tense, i, forms[i] ?? [])).join(". ")} size="sm" slow />
            </div>
          </div>
        )}

        {!checked && (
          <div className="flex justify-center gap-2" aria-label={t("conj.accents")}>
            {ACCENTS.map((char) => (
              <button
                key={char}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertAccent(char)}
                className="size-12 rounded-lg bg-slate-200 text-xl dark:bg-slate-800"
              >
                {char}
              </button>
            ))}
          </div>
        )}

        <button type="submit" className={`${primaryButton} mt-auto w-full`}>
          {checked ? t("conj.finishCard") : t("conj.checkTable")}
        </button>
      </form>
    </>
  );
}
