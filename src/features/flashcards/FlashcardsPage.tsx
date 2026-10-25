import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Rating, State, type Grade } from "ts-fsrs";
import { useContent } from "../../app/content.tsx";
import { useTopics } from "../../app/topics.ts";
import { useWordDetails } from "../../app/wordDetails.ts";
import { db } from "../../data/db/instance.ts";
import { saveReview } from "../../data/db/repositories.ts";
import { loadStudyOverview, loadTopicStudy } from "../../data/queries.ts";
import { useT, type Key } from "../../i18n/index.ts";
import { LEARN_AHEAD_MS } from "../../domain/session/buildDailySession.ts";
import { DEFAULT_SETTINGS, type Settings } from "../../domain/settings.ts";
import { formatInterval } from "../../domain/srs/format.ts";
import { newStoredCard, previewDue, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import type { StoredCard } from "../../domain/srs/types.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { useSessionStore } from "../../store/sessionStore.ts";
import { WordCard } from "./WordCard.tsx";
import { Lupino } from "../../ui/mascot/Lupino.tsx";

const BUTTONS: { grade: Grade; label: Key; color: string }[] = [
  { grade: Rating.Again, label: "rate.again", color: "bg-red-700" },
  { grade: Rating.Hard, label: "rate.hard", color: "bg-amber-700" },
  { grade: Rating.Good, label: "rate.good", color: "bg-brand" },
  { grade: Rating.Easy, label: "rate.easy", color: "bg-sky-700" },
];

interface CurrentCard {
  card: StoredCard;
  labels: Record<Grade, string>;
}

export function FlashcardsPage() {
  const { t, tp } = useT();
  const content = useContent();
  const details = useWordDetails();
  // în „Studiază tema” sesiunea conține doar cuvintele temei
  const { id: topicId } = useParams();
  const topics = useTopics();
  const topic = topicId ? topics?.find((x) => x.id === topicId) : undefined;
  const exitTo = topicId ? `/learn/topics/${topicId}` : "/";
  const { queue, index, flipped, shownAt, answered, start, flip, advance, reset } = useSessionStore();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [current, setCurrent] = useState<CurrentCard>();
  const busy = useRef(false);

  useEffect(() => {
    if (topicId && !topic) return; // temele nu s-au încărcat încă
    let alive = true;
    void (topic ? loadTopicStudy(db, topic) : loadStudyOverview(db, content)).then((overview) => {
      if (!alive) return;
      setSettings(overview.settings);
      start(overview.queue);
      setReady(true);
    });
    return () => {
      alive = false;
      reset();
    };
  }, [content, topic, topicId, start, reset]);

  const item = queue[index];

  // Încarcă cardul curent (sau creează unul nou) și calculează etichetele butoanelor.
  useEffect(() => {
    setCurrent(undefined);
    if (!item) return;
    let alive = true;
    void db.cards.get(item.cardId).then((existing) => {
      if (!alive) return;
      const now = new Date();
      const card =
        existing ??
        newStoredCard(
          { cardId: item.cardId, wordId: item.wordId, kind: "vocab", variant: item.variant },
          now,
          studyDayOf(now),
        );
      const due = previewDue(card, now, settings.retention);
      setCurrent({
        card,
        labels: {
          [Rating.Again]: formatInterval(due[Rating.Again], now, tp),
          [Rating.Hard]: formatInterval(due[Rating.Hard], now, tp),
          [Rating.Good]: formatInterval(due[Rating.Good], now, tp),
          [Rating.Easy]: formatInterval(due[Rating.Easy], now, tp),
        },
      });
    });
    return () => {
      alive = false;
    };
  }, [item?.cardId, index, settings.retention]);

  const rate = async (grade: Grade) => {
    if (!item || !current || busy.current) return;
    busy.current = true;
    try {
      const now = new Date();
      const { card, log } = reviewStoredCard(current.card, grade, now, settings.retention);
      await saveReview(db, card, log, { source: "flashcard", now, durationMs: now.getTime() - shownAt });
      const comesBackSoon =
        (card.state === State.Learning || card.state === State.Relearning) &&
        card.due.getTime() - now.getTime() < LEARN_AHEAD_MS;
      advance(comesBackSoon ? { ...item, isNew: false } : undefined);
    } finally {
      busy.current = false;
    }
  };

  // Comenzi de la tastatură: Space/Enter răstoarnă cardul, 1–4 notează.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["BUTTON", "A", "INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!flipped && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        flip();
      } else if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        void rate(Number(event.key) as Grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!ready || !details) {
    return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <Lupino pose={answered > 0 ? "bravo" : "relax"} size={160} />
        <h1 className="text-2xl font-bold">
          {answered > 0 ? t("flash.done") : t("learn.nothingToDo")}
        </h1>
        <p className="text-muted">
          {answered > 0 ? tp("flash.reviewed", answered) : t("flash.comeBack")}
        </p>
        <Link to={exitTo} className="flex min-h-14 items-center rounded-xl bg-brand px-8 text-lg font-semibold text-white">
          {topicId ? t("flash.backToTopic") : t("flash.backHome")}
        </Link>
      </div>
    );
  }

  const word = details.get(item.wordId);
  if (!word) {
    // Cuvântul a dispărut din dicționar după o actualizare; îl sărim fără a-l nota.
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t("flash.cardGone")}</p>
        <button type="button" onClick={() => advance()} className="min-h-12 rounded-xl bg-brand px-6 text-white">
          {t("common.continue")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <header className="flex items-center gap-3">
        <Link to={exitTo} aria-label={t("study.exit")} className="flex size-12 items-center justify-center text-2xl">
          ✕
        </Link>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-valuenow={index}
          aria-label={t("study.progress")}
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div className="h-full bg-brand transition-[width]" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
        <span className="w-14 text-right text-sm text-muted">
          {index + 1} / {queue.length}
        </span>
      </header>

      {settings.direction === "both" && (
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted" data-testid="card-direction">
          {t(item.variant === "it-ro" ? "dir.itRo" : "dir.roIt")}
        </p>
      )}
      {item.isNew && (
        <p className="text-center text-sm font-semibold text-brand-fg">
          {item.reverse ? t("flash.newReverse") : t("flash.newWord")}
        </p>
      )}

      <WordCard
        key={`${item.cardId}-${index}`}
        word={word}
        direction={item.variant}
        rate={settings.ttsRate}
        flipped={flipped}
        onFlip={flip}
        onSwipe={(grade) => void rate(grade)}
      />

      {flipped ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t("flash.howWell")}>
          {BUTTONS.map(({ grade, label, color }) => (
            <button
              key={grade}
              type="button"
              disabled={!current}
              onClick={() => void rate(grade)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl text-white disabled:opacity-50 ${color}`}
            >
              <span className="font-semibold">{t(label)}</span>
              <span className="text-xs">{current?.labels[grade] ?? "…"}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={flip}
          className="min-h-16 rounded-xl bg-brand text-lg font-semibold text-white active:bg-brand-dark"
        >
          {t("flash.showAnswer")}
        </button>
      )}
    </div>
  );
}
