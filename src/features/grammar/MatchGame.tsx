import { useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../data/db/instance.ts";
import { getSettings, saveGameScore } from "../../data/db/repositories.ts";
import type { GrammarItem } from "../../domain/content/schema.ts";
import { buildGrammarMatchRounds, type GrammarPair } from "../../domain/grammar/games.ts";
import { matchScore } from "../../domain/grammar/progress.ts";
import { shuffle } from "../../domain/random.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { useT } from "../../i18n/index.ts";
import { playFeedback } from "../../services/sound.ts";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { nextLessonNav, readLessonNav } from "./lessonNav.ts";
import { useGrammarTopic } from "./useGrammarTopic.ts";

/** Potrivire: 5 perechi expresie italiană ↔ traducere pe rundă; se atinge câte una din fiecare coloană. */
export function MatchPage() {
  const { t } = useT();
  const { id, topic, loading } = useGrammarTopic();
  if (loading) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  if (!topic) {
    return <SessionDone emoji="🤔" title={t("topics.notFound")} text="" backTo="/learn/grammar" backLabel={t("games.backToList")} />;
  }
  return <MatchGame key={id} topicId={topic.id} items={topic.items} />;
}

function MatchGame({ topicId, items }: { topicId: string; items: GrammarItem[] }) {
  const { t, tp } = useT();
  const exitTo = `/learn/grammar/${topicId}`;
  // întoarcerea în lecție păstrează ecranul de plecare (ex. fișa cuvântului)
  const exitState = nextLessonNav(readLessonNav(useLocation().state));
  const [attempt, setAttempt] = useState(0);
  const rounds = useMemo(
    () => buildGrammarMatchRounds(items),
    // o nouă încercare amestecă din nou
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, attempt],
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [matched, setMatched] = useState<ReadonlySet<string>>(new Set());
  const [left, setLeft] = useState<string>();
  const [right, setRight] = useState<string>();
  const [wrong, setWrong] = useState<{ left: string; right: string }>();
  const [mistakes, setMistakes] = useState(0);

  const round = rounds[roundIndex];

  // scorul se salvează o singură dată pe încercare, la sfârșitul ultimei runde (doar dacă e mai bun)
  const saved = useRef(false);
  const finished = !!round && roundIndex + 1 >= rounds.length && round.every((p) => matched.has(p.id));
  const totalPairs = rounds.reduce((sum, r) => sum + r.length, 0);
  useEffect(() => {
    if (!finished || saved.current) return;
    saved.current = true;
    void saveGameScore(db, topicId, "match", matchScore(totalPairs, mistakes), new Date());
  }, [finished, totalPairs, mistakes, topicId]);

  const rightOrder = useMemo(() => (round ? shuffle(round) : []), [round]);

  const choose = async (side: "left" | "right", pairId: string) => {
    if (!round || wrong) return;
    const nextLeft = side === "left" ? pairId : left;
    const nextRight = side === "right" ? pairId : right;
    setLeft(nextLeft);
    setRight(nextRight);
    if (!nextLeft || !nextRight) return;

    const correct = nextLeft === nextRight;
    playFeedback(correct, (await getSettings(db)).soundEnabled);
    if (correct) {
      setMatched((m) => new Set([...m, nextLeft]));
      setLeft(undefined);
      setRight(undefined);
    } else {
      setMistakes((m) => m + 1);
      setWrong({ left: nextLeft, right: nextRight });
      setTimeout(() => {
        setWrong(undefined);
        setLeft(undefined);
        setRight(undefined);
      }, 600);
    }
  };

  if (!round) {
    return (
      <SessionDone
        emoji="🧩"
        title={t("match.nothing")}
        text={t("games.noExamples")}
        backTo={exitTo}
        backState={exitState}
        backLabel={t("flash.backToTopic")}
      />
    );
  }

  const roundDone = round.every((p) => matched.has(p.id));
  const lastRound = roundIndex + 1 >= rounds.length;

  if (roundDone && lastRound) {
    return (
      <SessionDone
        title={t("match.allDone")}
        text={mistakes === 0 ? t("match.noMistakes") : tp("match.mistakes", mistakes)}
        backTo={exitTo}
        backState={exitState}
        backLabel={t("flash.backToTopic")}
      >
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            saved.current = false;
            setAttempt((a) => a + 1);
            setRoundIndex(0);
            setMatched(new Set());
            setMistakes(0);
          }}
        >
          {t("common.anotherRound")}
        </button>
      </SessionDone>
    );
  }

  const cell = (pair: GrammarPair, side: "left" | "right") => {
    const done = matched.has(pair.id);
    const selected = (side === "left" ? left : right) === pair.id;
    const isWrong = wrong && (side === "left" ? wrong.left : wrong.right) === pair.id;
    const style = done
      ? "border-green-600 bg-green-100 text-green-950 opacity-60"
      : isWrong
        ? "border-red-600 bg-red-100 text-red-950"
        : selected
          ? "border-brand bg-sky-50 dark:bg-slate-800"
          : "border-slate-200 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900";
    return (
      <button
        key={`${side}-${pair.id}`}
        type="button"
        disabled={done}
        aria-pressed={selected}
        onClick={() => void choose(side, pair.id)}
        className={`min-h-16 rounded-xl border-2 px-3 text-lg font-medium ${style}`}
      >
        <span lang={side === "left" ? "it" : NATIVE_LANGUAGE}>{side === "left" ? pair.it : pair.ro}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={roundIndex} total={rounds.length} label={t("games.progress")} exitTo={exitTo} exitState={exitState} />
      <h1 className="text-center text-lg font-semibold">{t("match.title")}</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3" role="group" aria-label={t("lang.it")}>
          {round.map((p) => cell(p, "left"))}
        </div>
        <div className="flex flex-col gap-3" role="group" aria-label={t("lang.ro")}>
          {rightOrder.map((p) => cell(p, "right"))}
        </div>
      </div>
      {roundDone && (
        <div className="mt-auto">
          <button
            type="button"
            className={`${primaryButton} w-full`}
            onClick={() => {
              setRoundIndex((i) => i + 1);
              setMatched(new Set());
            }}
          >
            {t("match.next")}
          </button>
        </div>
      )}
    </div>
  );
}
