import { useMemo, useState } from "react";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import type { GrammarItem } from "../../domain/content/schema.ts";
import { buildGrammarMatchRounds, type GrammarPair } from "../../domain/grammar/games.ts";
import { shuffle } from "../../domain/random.ts";
import { playFeedback } from "../../services/sound.ts";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { useGrammarTopic } from "./useGrammarTopic.ts";

/** Potrivire: 5 perechi expresie italiană ↔ traducere pe rundă; se atinge câte una din fiecare coloană. */
export function MatchPage() {
  const { id, topic, loading } = useGrammarTopic();
  if (loading) return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  if (!topic) return <SessionDone emoji="🤔" title="Tema nu există" text="" backTo="/learn/games" backLabel="Înapoi la jocuri" />;
  return <MatchGame key={id} topicId={topic.id} items={topic.items} />;
}

function MatchGame({ topicId, items }: { topicId: string; items: GrammarItem[] }) {
  const exitTo = `/learn/games/${topicId}`;
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
    return <SessionDone emoji="🧩" title="Nimic de potrivit" text="Tema nu are exemple." backTo={exitTo} backLabel="Înapoi la temă" />;
  }

  const roundDone = round.every((p) => matched.has(p.id));
  const lastRound = roundIndex + 1 >= rounds.length;

  if (roundDone && lastRound) {
    return (
      <SessionDone
        title="Ai potrivit toate perechile"
        text={mistakes === 0 ? "Fără nicio greșeală!" : `${mistakes} ${mistakes === 1 ? "greșeală" : "greșeli"}.`}
        backTo={exitTo}
        backLabel="Înapoi la temă"
      >
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setAttempt((a) => a + 1);
            setRoundIndex(0);
            setMatched(new Set());
            setMistakes(0);
          }}
        >
          Încă o rundă
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
        {side === "left" ? pair.it : pair.ro}
      </button>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={roundIndex} total={rounds.length} label="Progresul jocului" exitTo={exitTo} />
      <h1 className="text-center text-lg font-semibold">Potrivește perechile</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3" role="group" aria-label="Italiană">
          {round.map((p) => cell(p, "left"))}
        </div>
        <div className="flex flex-col gap-3" role="group" aria-label="Română">
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
            Runda următoare
          </button>
        </div>
      )}
    </div>
  );
}
