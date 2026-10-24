import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { State, type Grade } from "ts-fsrs";
import { useConjugations } from "../../app/conjugations.ts";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { getSettings, saveReview, saveSettings } from "../../data/db/repositories.ts";
import { loadConjugationOverview } from "../../data/queries.ts";
import { CONJUGATION_MODE_LABEL } from "../../domain/content/display.ts";
import { LEARN_AHEAD_MS } from "../../domain/session/buildDailySession.ts";
import type { ConjItem } from "../../domain/session/buildConjugationSession.ts";
import { DEFAULT_SETTINGS, type ConjugationMode, type Settings } from "../../domain/settings.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { primaryButton, SessionDone } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { FlipCard } from "./FlipCard.tsx";
import { TableCard } from "./TableCard.tsx";
import { WriteCard } from "./WriteCard.tsx";

const MODES: ConjugationMode[] = ["write", "flip", "table"];

export function ConjugationPage() {
  const content = useContent();
  const conjugations = useConjugations();
  const busy = useRef(false);

  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [queue, setQueue] = useState<ConjItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    if (!conjugations) return;
    let alive = true;
    void loadConjugationOverview(db, content, conjugations).then((overview) => {
      if (!alive) return;
      setSettings(overview.settings);
      setQueue(overview.queue);
      setIndex(0);
      setAnswered(0);
      setShownAt(Date.now());
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [content, conjugations]);

  const item = queue[index];

  // Cronometrul se repornește la fiecare card nou.
  useEffect(() => setShownAt(Date.now()), [item?.cardId, index]);

  const chooseMode = async (mode: ConjugationMode) => {
    setSettings((s) => ({ ...s, conjugationMode: mode }));
    await saveSettings(db, { ...(await getSettings(db)), conjugationMode: mode });
  };

  if (!ready || !conjugations) return <p className="p-6 text-center text-muted">Se încarcă…</p>;

  if (!item) {
    return (
      <SessionDone
        emoji={answered > 0 ? undefined : "🔒"}
        title={answered > 0 ? "Sesiune încheiată" : "Nimic de conjugat acum"}
        text={
          answered > 0
            ? `Ai parcurs ${answered} ${answered === 1 ? "card" : "carduri"}.`
            : "Conjugarea unui verb se deblochează după ce îl înveți în Flashcards și ajunge la repetare."
        }
      >
        {answered === 0 && (
          <Link to="/learn/vocab" className={primaryButton}>
            Mergi la Flashcards
          </Link>
        )}
      </SessionDone>
    );
  }

  const verb = content.byId(item.verbId);
  const forms = conjugations[item.verbId]?.[item.tense];
  if (!verb || !forms) return null;

  const finishCard = async (grade: Grade) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const now = new Date();
      const existing = await db.cards.get(item.cardId);
      const card =
        existing ??
        newStoredCard(
          { cardId: item.cardId, wordId: item.verbId, kind: "conj", variant: item.tense },
          now,
          studyDayOf(now),
        );
      const { card: next, log } = reviewStoredCard(card, grade, now, settings.retention);
      await saveReview(db, next, log, { source: "conj", now, durationMs: now.getTime() - shownAt });

      const comesBackSoon =
        (next.state === State.Learning || next.state === State.Relearning) &&
        next.due.getTime() - now.getTime() < LEARN_AHEAD_MS;
      if (comesBackSoon) setQueue((q) => [...q, { ...item, isNew: false }]);
      setAnswered((a) => a + 1);
      setIndex((i) => i + 1);
    } finally {
      busy.current = false;
    }
  };

  const Card = { write: WriteCard, flip: FlipCard, table: TableCard }[settings.conjugationMode];

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={queue.length} />
      {item.isNew && <p className="text-center text-sm font-semibold text-brand-fg">Timp nou</p>}

      <div role="radiogroup" aria-label="Varianta de conjugare" className="grid grid-cols-3 gap-2">
        {MODES.map((mode) => {
          const active = settings.conjugationMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void chooseMode(mode)}
              className={`min-h-12 rounded-xl border-2 px-2 text-sm font-semibold ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {CONJUGATION_MODE_LABEL[mode]}
            </button>
          );
        })}
      </div>

      {/* cheia face ca un card nou sau o altă variantă să pornească de la zero */}
      <Card
        key={`${item.cardId}-${index}-${settings.conjugationMode}`}
        item={item}
        verb={verb}
        forms={forms}
        settings={settings}
        onFinish={(grade) => void finishCard(grade)}
      />
    </div>
  );
}
