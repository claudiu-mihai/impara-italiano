import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSentences } from "../../app/sentences.ts";
import { useTopics } from "../../app/topics.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { loadSentenceRound, loadTopicSentenceRound } from "../../data/roundQueries.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import {
  isCorrectArrangement,
  scrambleOrder,
  sentenceText,
  type SentenceQuestion,
} from "../../domain/sentence/sentenceRound.ts";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import { playFeedback } from "../../services/sound.ts";
import { speak } from "../../services/tts.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { LupinoFill } from "../../ui/mascot/Lupino.tsx";
import { useListening } from "../../ui/useListening.ts";

const block =
  "min-h-12 rounded-lg border-2 border-slate-300 bg-white px-4 text-lg font-medium active:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800";

export function SentencePage() {
  const { t } = useT();
  const sentences = useSentences();
  // din pagina unei teme: doar propozițiile cu cuvinte din temă, iar ✕ și finalul te întorc la temă
  const { id: topicId } = useParams();
  const topics = useTopics();
  const topic = topicId ? topics?.find((x) => x.id === topicId) : undefined;
  const exitTo = topicId ? `/learn/topics/${topicId}` : "/learn";
  const backLabel = topicId ? t("flash.backToTopic") : undefined;
  const [round, setRound] = useState(0);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Starea întrebării curente: ordinea amestecată a blocurilor și blocurile puse în răspuns.
  const [order, setOrder] = useState<number[]>([]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (!sentences) return;
    if (topicId && !topic) return; // temele nu s-au încărcat încă
    let alive = true;
    setReady(false);
    const round = topic ? loadTopicSentenceRound(db, sentences, topic) : loadSentenceRound(db, sentences);
    void Promise.all([getSettings(db), round]).then(([loadedSettings, loaded]) => {
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
  }, [sentences, round, topic, topicId]);

  const question = questions[index];
  const listening = useListening(settings.listenFirst);
  const fromAudio = listening && question?.listen === true;

  useEffect(() => {
    setOrder(question ? scrambleOrder(question) : []);
    setPlaced([]);
    setResult(null);
  }, [question?.id, index]);

  // din auz: propoziția se aude singură la apariție
  useEffect(() => {
    if (fromAudio && question) speak(sentenceText(question), settings.ttsRate);
    // doar la schimbarea întrebării, nu a vitezei
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAudio, question?.id, index]);

  if (!ready) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  if (questions.length === 0) {
    return (
      <SessionDone
        emoji="🧩"
        title={t("sentence.none")}
        text={t("sentence.noneText")}
        backTo={exitTo}
        backLabel={backLabel}
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
        text={score === questions.length ? t("common.perfect") : t("sentence.tryAgain")}
        backTo={exitTo}
        backLabel={backLabel}
      >
        <button type="button" onClick={() => setRound((r) => r + 1)} className={primaryButton}>
          {t("common.anotherRound")}
        </button>
      </SessionDone>
    );
  }

  // indicii de după `tokens` sunt capcanele: cuvinte din alte propoziții
  const blockText = (i: number) => question.tokens[i] ?? question.decoys[i - question.tokens.length] ?? "";
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
      <StudyHeader index={index} total={questions.length} label={t("quiz.roundProgress")} exitTo={exitTo} />

      <section className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
        <p className="text-sm text-muted">{t(fromAudio ? "sentence.listenItalian" : "sentence.writeItalian")}</p>
        {fromAudio && <AudioButton text={sentenceText(question)} rate={settings.ttsRate} size="lg" />}
        {/* din auz, traducerea apare abia după răspuns */}
        {(!fromAudio || result !== null) && (
          <p lang={NATIVE_LANGUAGE} className="mt-2 text-2xl font-bold">
            {question.ro}
          </p>
        )}
        {question.decoys.length > 0 && result === null && <p className="text-sm text-muted">{t("sentence.decoyHint")}</p>}
      </section>

      <div
        aria-label={t("sentence.yourAnswer")}
        className={`flex min-h-24 flex-wrap content-start items-center gap-2 rounded-2xl border-2 border-dashed p-3 ${
          result === "correct"
            ? "border-green-600 bg-green-50 dark:bg-green-950"
            : result === "wrong"
              ? "border-red-600 bg-red-50 dark:bg-red-950"
              : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {placed.length === 0 && <span className="text-muted">{t("sentence.tapWords")}</span>}
        {placed.map((i) => (
          <button
            key={i}
            type="button"
            disabled={result !== null}
            onClick={() => setPlaced((p) => p.filter((x) => x !== i))}
            aria-label={t("sentence.removeWord", { word: blockText(i) })}
            className={block}
          >
            {blockText(i)}
          </button>
        ))}
        {placed.length > 0 && <span className="text-lg font-medium">{question.punctuation}</span>}
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t("sentence.available")}>
        {bank.map((i) => (
          <button
            key={i}
            type="button"
            disabled={result !== null || complete}
            onClick={() => setPlaced((p) => [...p, i])}
            className={block}
          >
            {blockText(i)}
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
        {result === "correct" && <p className="text-center font-semibold text-green-700 dark:text-green-400">{t("conj.correct")}</p>}
        {result === "wrong" && (
          <div className="text-center">
            <p className="font-semibold text-red-700 dark:text-red-400">{t("sentence.correctVersion")}</p>
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
              {t("sentence.reset")}
            </button>
            <button type="button" disabled={!complete} onClick={check} className={`${primaryButton} flex-1 disabled:opacity-40`}>
              {t("conj.check")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={next} className={`${primaryButton} w-full`}>
            {index + 1 < questions.length ? t("common.continue") : t("common.seeResult")}
          </button>
        )}
      </div>
    </div>
  );
}
