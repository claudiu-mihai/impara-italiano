import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Rating } from "ts-fsrs";
import { useContent } from "../../app/content.tsx";
import { useTopics } from "../../app/topics.ts";
import { useWordDetails } from "../../app/wordDetails.ts";
import { db } from "../../data/db/instance.ts";
import { saveReview } from "../../data/db/repositories.ts";
import { loadQuizRound, loadTopicQuiz } from "../../data/queries.ts";
import { useT } from "../../i18n/index.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { promptText } from "../../domain/content/display.ts";
import type { QuizQuestion } from "../../domain/quiz/buildQuizRound.ts";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { playFeedback } from "../../services/sound.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { LupinoFill } from "../../ui/mascot/Lupino.tsx";

export function QuizPage() {
  const { t } = useT();
  const content = useContent();
  const details = useWordDetails();
  // în „Studiază tema” întrebările vin doar din cuvintele temei
  const { id: topicId } = useParams();
  const topics = useTopics();
  const topic = topicId ? topics?.find((x) => x.id === topicId) : undefined;
  const exitTo = topicId ? `/learn/topics/${topicId}` : "/learn";
  const [round, setRound] = useState(0);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    if (topicId && !topic) return; // temele nu s-au încărcat încă
    let alive = true;
    setReady(false);
    void (topic ? loadTopicQuiz(db, content, topic) : loadQuizRound(db, content)).then((loaded) => {
      if (!alive) return;
      setSettings(loaded.settings);
      setQuestions(loaded.questions);
      setIndex(0);
      setSelected(null);
      setScore(0);
      setShownAt(Date.now());
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [content, topic, topicId, round]);

  const question = questions[index];

  const choose = async (choice: number) => {
    if (!question || selected !== null) return;
    setSelected(choice);
    const correct = choice === question.correctIndex;
    playFeedback(correct, settings.soundEnabled);
    if (correct) setScore((s) => s + 1);

    const now = new Date();
    // la tema nouă primul răspuns creează cardul
    const card =
      (await db.cards.get(question.cardId)) ??
      newStoredCard(
        { cardId: question.cardId, wordId: question.wordId, kind: "vocab", variant: question.direction },
        now,
        studyDayOf(now),
      );
    const { card: next, log } = reviewStoredCard(card, correct ? Rating.Good : Rating.Again, now, settings.retention);
    await saveReview(db, next, log, { source: "quiz", now, durationMs: now.getTime() - shownAt });
  };

  const next = () => {
    setSelected(null);
    setIndex((i) => i + 1);
    setShownAt(Date.now());
  };

  if (!ready) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  if (questions.length === 0) {
    return (
      <SessionDone
        emoji="🃏"
        title={t("quiz.noWords")}
        text={t("quiz.noWordsText")}
        backTo={exitTo}
        backLabel={topicId ? t("flash.backToTopic") : undefined}
      >
        <Link to="/learn/vocab" className={primaryButton}>
          {t("conj.goFlashcards")}
        </Link>
      </SessionDone>
    );
  }

  if (!question) {
    return (
      <SessionDone
        title={t("common.outOf", { n: score, total: questions.length })}
        text={score === questions.length ? t("common.perfect") : t("quiz.wrongReturn")}
        backTo={exitTo}
        backLabel={topicId ? t("flash.backToTopic") : undefined}
      >
        <button type="button" onClick={() => setRound((r) => r + 1)} className={primaryButton}>
          {t("common.anotherRound")}
        </button>
      </SessionDone>
    );
  }

  const word = content.byId(question.wordId);
  if (!word) return null;
  const answered = selected !== null;
  // exemplul vine din detaliile încărcate lazy; până atunci lipsește, fără a bloca întrebarea
  const example = details?.get(word.id)?.examples[0];

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={questions.length} label={t("quiz.roundProgress")} exitTo={exitTo} />

      <section className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">
          {t(question.direction === "it-ro" ? "quiz.askItRo" : "quiz.askRoIt")}
        </p>
        <div className="flex items-center gap-3">
          <p lang={question.direction === "it-ro" ? "it" : NATIVE_LANGUAGE} className="text-4xl font-bold">
            {promptText(word, question.direction)}
          </p>
          {question.direction === "it-ro" && (
            <AudioButton text={promptText(word, question.direction)} rate={settings.ttsRate} />
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3" role="group" aria-label={t("quiz.options")}>
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const state = !answered
            ? "border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
            : isCorrect
              ? "border-green-600 bg-green-100 text-green-950"
              : i === selected
                ? "border-red-600 bg-red-100 text-red-950"
                : "border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900";
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => void choose(i)}
              className={`min-h-14 rounded-xl border-2 px-4 text-left text-lg ${state}`}
            >
              <span lang={question.direction === "it-ro" ? NATIVE_LANGUAGE : "it"}>{option}</span>
              {answered && isCorrect && <span className="sr-only">{t("quiz.srCorrect")}</span>}
              {answered && i === selected && !isCorrect && <span className="sr-only">{t("quiz.srWrong")}</span>}
            </button>
          );
        })}
      </div>

      {/* Lupino reacționează la răspuns și ocupă cea mai mare parte din spațiul liber de sub variante */}
      {answered && (
        <LupinoFill
          key={index}
          pose={selected === question.correctIndex ? "bravo" : "pensa"}
          ratio={0.8}
          max={420}
          className="lupino-react"
        />
      )}

      <div className="mt-auto flex flex-col gap-3" aria-live="polite">
        {answered && (
          <>
            <p className={`text-center font-semibold ${selected === question.correctIndex ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
              {selected === question.correctIndex ? t("conj.correct") : t("quiz.notQuite")}
            </p>
            {example && (
              <p className="text-center text-sm text-muted">
                {example.it} — <span lang={NATIVE_LANGUAGE}>{example.ro}</span>
              </p>
            )}
            <button type="button" onClick={next} className={`${primaryButton} w-full`}>
              {index + 1 < questions.length ? t("common.continue") : t("common.seeResult")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
