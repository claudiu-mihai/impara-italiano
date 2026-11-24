import { useRef, useState, type ReactNode } from "react";
import { useContent } from "../../../app/content.tsx";
import { NATIVE_LANGUAGE } from "../../../domain/content/constants.ts";
import { promptText } from "../../../domain/content/display.ts";
import type { FeedItem } from "../../../domain/feed/types.ts";
import { splitAtGap } from "../../../domain/grammar/gap.ts";
import { shuffle } from "../../../domain/random.ts";
import { useT } from "../../../i18n/index.ts";
import { speak } from "../../../services/tts.ts";
import { AudioButton } from "../../../ui/AudioButton.tsx";
import { useListening } from "../../../ui/useListening.ts";
import { useAutoSpeak, useFeedEnv } from "../feedEnv.ts";
import { CardFrame } from "./CardFrame.tsx";

type Of<T extends FeedItem["type"]> = Extract<FeedItem, { type: T }>;
interface CardProps {
  active: boolean;
}

interface ChoicesProps {
  label: string;
  options: readonly { text: string; lang?: string }[];
  correctIndex: number;
  selected: number | null;
  onChoose: (index: number) => void;
}

/** Variantele unui test: răspuns imediat, cu verde la corect și roșu la greșit. `data-choice` / `data-correct` servesc tastelor 1–4 și testelor. */
function Choices({ label, options, correctIndex, selected, onChoose }: ChoicesProps) {
  const { t } = useT();
  const answered = selected !== null;
  return (
    <div className="flex w-full max-w-sm flex-col gap-3" role="group" aria-label={label}>
      {options.map((option, i) => {
        const isCorrect = i === correctIndex;
        const state = !answered
          ? "border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
          : isCorrect
            ? "border-green-600 bg-green-100 text-green-950"
            : i === selected
              ? "border-red-600 bg-red-100 text-red-950"
              : "border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900";
        return (
          <button
            key={`${option.text}-${i}`}
            type="button"
            data-choice
            data-correct={isCorrect ? "" : undefined}
            disabled={answered}
            onClick={() => onChoose(i)}
            className={`min-h-14 rounded-xl border-2 px-4 text-left text-lg ${state}`}
          >
            <span lang={option.lang}>{option.text}</span>
            {answered && isCorrect && <span className="sr-only">{t("quiz.srCorrect")}</span>}
            {answered && i === selected && !isCorrect && <span className="sr-only">{t("quiz.srWrong")}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Rezultatul după răspuns, anunțat cititoarelor de ecran, cu mențiunea „exersare liberă” când programul nu se schimbă. */
function Result({ correct, free }: { correct: boolean | undefined; free: boolean }) {
  const { t } = useT();
  return (
    <div aria-live="polite" className="min-h-12 text-center">
      {correct !== undefined && (
        <>
          <p className={`font-semibold ${correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{correct ? t("conj.correct") : t("quiz.notQuite")}</p>
          {free && <p className="text-xs text-muted">{t("feed.freePractice")}</p>}
        </>
      )}
    </div>
  );
}

/** O întrebare ca în Quiz (4 variante, uneori din auz) despre un cuvânt început; se notează doar grila de după un cuvânt nou. */
export function GridCard({ item, active }: CardProps & { item: Of<"grid"> }) {
  const { t } = useT();
  const content = useContent();
  const { settings, gradeFollowUp, reportAnswer } = useFeedEnv();
  const q = item.question;
  const word = content.byId(q.wordId);
  const listening = useListening(settings.listenFirst);
  const fromAudio = listening && q.listen;
  const [selected, setSelected] = useState<number | null>(null);
  const [graded, setGraded] = useState(false);
  const shownAt = useRef(Date.now());
  useAutoSpeak(active, () => fromAudio && word && speak(promptText(word, "it-ro"), settings.ttsRate));
  if (!word) return null;
  const answered = selected !== null;

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    const correct = i === q.correctIndex;
    reportAnswer(correct);
    if (q.followUp) void gradeFollowUp(q, correct, shownAt.current).then(setGraded);
  };

  return (
    <CardFrame label={t("feed.kind.test")}>
      <p className="text-sm text-muted">{t(fromAudio ? "quiz.askListen" : q.direction === "it-ro" ? "quiz.askItRo" : "quiz.askRoIt")}</p>
      <div className="flex items-center gap-3">
        {(!fromAudio || answered) && (
          <p lang={q.direction === "it-ro" ? "it" : NATIVE_LANGUAGE} className="text-4xl font-bold">
            {promptText(word, q.direction)}
          </p>
        )}
        {q.direction === "it-ro" && <AudioButton text={promptText(word, q.direction)} rate={settings.ttsRate} size={fromAudio && !answered ? "lg" : "md"} />}
      </div>
      <Choices
        label={t("quiz.options")}
        options={q.options.map((text) => ({ text, lang: q.direction === "it-ro" ? NATIVE_LANGUAGE : "it" }))}
        correctIndex={q.correctIndex}
        selected={selected}
        onChoose={choose}
      />
      <Result correct={answered ? selected === q.correctIndex : undefined} free={answered && !graded} />
    </CardFrame>
  );
}

/** „cane = pisică?”: adevărat sau fals, o singură atingere. */
export function TrueFalseCard({ item }: CardProps & { item: Of<"trueFalse"> }) {
  const { t } = useT();
  const content = useContent();
  const { reportAnswer } = useFeedEnv();
  const word = content.byId(item.wordId);
  const [selected, setSelected] = useState<number | null>(null);
  if (!word) return null;
  const correctIndex = item.isTrue ? 0 : 1;
  return (
    <CardFrame label={t("feed.kind.test")}>
      <p lang={item.direction === "it-ro" ? "it" : NATIVE_LANGUAGE} className="max-w-sm text-3xl font-bold">
        {t("feed.trueFalse", { prompt: promptText(word, item.direction), shown: item.shown })}
      </p>
      <Choices
        label={t("quiz.options")}
        options={[{ text: `✓ ${t("feed.true")}` }, { text: `✗ ${t("feed.false")}` }]}
        correctIndex={correctIndex}
        selected={selected}
        onChoose={(i) => {
          if (selected !== null) return;
          setSelected(i);
          reportAnswer(i === correctIndex);
        }}
      />
      <Result correct={selected === null ? undefined : selected === correctIndex} free={selected !== null} />
    </CardFrame>
  );
}

/** O propoziție din lecțiile de gramatică, cu un cuvânt lipsă și 3 variante. */
export function GapCard({ item }: CardProps & { item: Of<"gap"> }) {
  const { t } = useT();
  const { sources, reportAnswer } = useFeedEnv();
  const [selected, setSelected] = useState<number | null>(null);
  const grammarItem = sources.grammar.find((g) => g.id === item.grammarId)?.items.find((x) => x.id === item.itemId);
  if (!grammarItem) return null;
  const parts = splitAtGap(grammarItem.it, grammarItem.gap);
  const answered = selected !== null;
  const gap: ReactNode = answered ? <strong className="text-brand-fg">{grammarItem.gap}</strong> : <span aria-label="___">___</span>;
  return (
    <CardFrame label={t("feed.kind.gap")}>
      <p lang="it" className="max-w-sm text-2xl font-semibold">
        {parts ? (
          <>
            {parts.before}
            {gap}
            {parts.after}
          </>
        ) : (
          grammarItem.it
        )}
      </p>
      <p lang={NATIVE_LANGUAGE} className="max-w-sm text-sm text-muted">
        {grammarItem.ro}
      </p>
      <Choices
        label={t("quiz.options")}
        options={item.options.map((text) => ({ text, lang: "it" }))}
        correctIndex={item.correctIndex}
        selected={selected}
        onChoose={(i) => {
          if (answered) return;
          setSelected(i);
          reportAnswer(i === item.correctIndex);
        }}
      />
      <Result correct={answered ? selected === item.correctIndex : undefined} free={answered} />
    </CardFrame>
  );
}

/** Testul unui item din pachet; variantele se amestecă o singură dată, ca răspunsul corect să nu fie mereu prima. */
export function PackQuizCard({ item }: CardProps & { item: Of<"packQuiz"> }) {
  const { t, language } = useT();
  const { sources, settings, reportAnswer, markQuizzed } = useFeedEnv();
  const pack = sources.pack.find((p) => p.id === item.packId);
  const quiz = pack?.quiz;
  const [order] = useState(() => shuffle(quiz?.options.map((_, i) => i) ?? []));
  const [selected, setSelected] = useState<number | null>(null);
  if (!pack || !quiz) return null;
  const options = order.map((i) => ({ text: quiz.options[i]! }));
  const correctIndex = order.indexOf(quiz.answer);
  return (
    <CardFrame label={t("feed.kind.test")}>
      <p lang="it" className="max-w-sm text-2xl font-semibold">
        {quiz.question.it}
      </p>
      {settings.nativeHelp && language !== "it" && (
        <p lang={NATIVE_LANGUAGE} className="max-w-sm text-sm text-muted">
          {quiz.question.ro}
        </p>
      )}
      <Choices
        label={t("quiz.options")}
        options={options}
        correctIndex={correctIndex}
        selected={selected}
        onChoose={(i) => {
          if (selected !== null) return;
          setSelected(i);
          markQuizzed(item.packId);
          reportAnswer(i === correctIndex);
        }}
      />
      <Result correct={selected === null ? undefined : selected === correctIndex} free={selected !== null} />
    </CardFrame>
  );
}
