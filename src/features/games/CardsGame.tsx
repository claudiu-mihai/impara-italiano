import { useState } from "react";
import { pickSession } from "../../domain/grammar/games.ts";
import type { GrammarItem } from "../../domain/content/schema.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { GapText } from "./GapText.tsx";
import { useGrammarTopic } from "./useGrammarTopic.ts";

/** Cartonașe: se vede expresia cu lacună, se întoarce cartonașul, apoi „Am știut” sau „Mai exersez”. */
export function CardsPage() {
  const { id, topic, loading } = useGrammarTopic();
  if (loading) return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  if (!topic) return <SessionDone emoji="🤔" title="Tema nu există" text="" backTo="/learn/games" backLabel="Înapoi la jocuri" />;
  return <CardsGame key={id} topicId={topic.id} items={topic.items} />;
}

function CardsGame({ topicId, items }: { topicId: string; items: GrammarItem[] }) {
  const exitTo = `/learn/games/${topicId}`;
  const [session, setSession] = useState(() => pickSession(items));
  // coada cartonașelor rămase: „Mai exersez” îl mută la sfârșit
  const [queue, setQueue] = useState(() => session.map((item) => item.id));
  const [flipped, setFlipped] = useState(false);

  const known = session.length - queue.length;
  const current = session.find((item) => item.id === queue[0]);

  if (!current) {
    return (
      <SessionDone title="Ai terminat cartonașele" text={`Ai parcurs ${session.length} cartonașe.`} backTo={exitTo} backLabel="Înapoi la temă">
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            const next = pickSession(items);
            setSession(next);
            setQueue(next.map((item) => item.id));
            setFlipped(false);
          }}
        >
          Încă o rundă
        </button>
      </SessionDone>
    );
  }

  const advance = (knew: boolean) => {
    setQueue((q) => (knew ? q.slice(1) : [...q.slice(1), q[0]!]));
    setFlipped(false);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={known} total={session.length} label="Progresul cartonașelor" exitTo={exitTo} />

      <section
        className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900"
        data-testid="grammar-card"
      >
        <p className="text-4xl font-bold">
          <GapText it={current.it} gap={current.gap} filled={flipped ? current.gap : undefined} tone={flipped ? "correct" : "neutral"} />
        </p>
        <p className="text-muted">{current.ro}</p>

        {flipped && (
          <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700" data-testid="grammar-answer">
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold">{current.it}</p>
              <AudioButton text={current.it} size="sm" />
            </div>
            {current.note && <p className="text-sm text-muted">{current.note}</p>}
          </div>
        )}
      </section>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => advance(false)}
            className="flex min-h-14 items-center justify-center rounded-xl bg-amber-700 text-lg font-semibold text-white"
          >
            Mai exersez
          </button>
          <button type="button" onClick={() => advance(true)} className={primaryButton}>
            Am știut
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setFlipped(true)} className={`${primaryButton} w-full`}>
          Arată răspunsul
        </button>
      )}
    </div>
  );
}
