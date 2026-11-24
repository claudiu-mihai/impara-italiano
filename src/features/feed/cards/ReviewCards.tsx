import { useEffect, useRef, useState } from "react";
import type { Grade } from "ts-fsrs";
import { useContent } from "../../../app/content.tsx";
import { db } from "../../../data/db/instance.ts";
import { NATIVE_LANGUAGE } from "../../../domain/content/constants.ts";
import { answerText, italianText, promptText } from "../../../domain/content/display.ts";
import type { FeedItem } from "../../../domain/feed/types.ts";
import { Rating } from "../../../domain/srs/fsrsConstants.ts";
import { formatInterval } from "../../../domain/srs/format.ts";
import { newStoredCard, previewDue } from "../../../domain/srs/scheduler.ts";
import { studyDayOf } from "../../../domain/time/studyDay.ts";
import { useT } from "../../../i18n/index.ts";
import { speak } from "../../../services/tts.ts";
import { AudioButton } from "../../../ui/AudioButton.tsx";
import { RatingButtons, useRatingHint } from "../../../ui/RatingButtons.tsx";
import { useListening } from "../../../ui/useListening.ts";
import { useAutoSpeak, useFeedEnv } from "../feedEnv.ts";
import { CardFrame } from "./CardFrame.tsx";

/** O a doua atingere în atâtea ms după dezvăluire se socotește dublă atingere („știu”). */
const DOUBLE_TAP_MS = 300;
/** Cât rămâne pe ecran inima de după „știu”. */
const HEART_MS = 900;

/**
 * Un card de vocabular cu răspunsul ascuns: o repetiție scadentă („review”) sau un cuvânt nou („newWord”). Atingerea
 * arată răspunsul, apoi se notează cu aceleași butoane ca la Flashcards. Dubla atingere înainte de dezvăluire (sau
 * „Știu”) notează „Bine”.
 */
function WordRatingCard({ item, active, isNew, cardKey }: { item: Extract<FeedItem, { type: "review" | "newWord" }>; active: boolean; isNew: boolean; cardKey: string }) {
  const { t, tp } = useT();
  const content = useContent();
  const { settings, sources, rate, afterRating } = useFeedEnv();
  const listening = useListening(settings.listenFirst);
  const hint = useRatingHint();
  const session = item.item;
  const word = content.byId(session.wordId);
  const detail = sources.details.get(session.wordId);
  const fromItalian = session.variant === "it-ro";

  const [revealed, setRevealed] = useState(false);
  const [showText, setShowText] = useState(false);
  const [rated, setRated] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [intervals, setIntervals] = useState<Record<Grade, string>>();
  const revealedAt = useRef(0);
  const shownAt = useRef(Date.now());
  const busy = useRef(false);

  // „Ascultă întâi”: la cardurile începute (IT → RO) fața e doar un 🔊, textul apare la cerere
  const listenOnly = listening && fromItalian && !isNew && !revealed && !showText;

  useAutoSpeak(active, () => fromItalian && word && speak(italianText(word), settings.ttsRate));

  const reveal = () => {
    setRevealed(true);
    revealedAt.current = Date.now();
    // RO → IT: răspunsul italian se aude la întoarcere
    if (!fromItalian && word && settings.autoPlayAudio) speak(italianText(word), settings.ttsRate);
  };

  // etichetele butoanelor (peste cât revine cardul), calculate când se dezvăluie răspunsul
  useEffect(() => {
    if (!revealed) return;
    let alive = true;
    void db.cards.get(session.cardId).then((existing) => {
      if (!alive) return;
      const now = new Date();
      const card = existing ?? newStoredCard({ cardId: session.cardId, wordId: session.wordId, kind: "vocab", variant: session.variant }, now, studyDayOf(now));
      const due = previewDue(card, now, settings.retention);
      const label = (grade: Grade) => formatInterval(due[grade], now, tp);
      setIntervals({ [Rating.Again]: label(Rating.Again), [Rating.Hard]: label(Rating.Hard), [Rating.Good]: label(Rating.Good), [Rating.Easy]: label(Rating.Easy) });
    });
    return () => {
      alive = false;
    };
  }, [revealed, session.cardId, session.wordId, session.variant, settings.retention, tp]);

  const doRate = async (grade: Grade, heart = false) => {
    if (busy.current || rated) return;
    busy.current = true;
    try {
      const card = await rate(session, grade, shownAt.current);
      if (!card) return;
      setRated(true);
      if (heart) {
        setHearted(true);
        setTimeout(() => setHearted(false), HEART_MS);
      }
      afterRating(cardKey, session, isNew);
    } finally {
      busy.current = false;
    }
  };

  const tapFace = () => {
    if (rated) return;
    if (!revealed) reveal();
    else if (Date.now() - revealedAt.current < DOUBLE_TAP_MS) void doRate(Rating.Good, true);
  };

  if (!word) return null;
  const front = promptText(word, session.variant);
  const answer = answerText(word, session.variant);
  const label = isNew ? `✨ ${t(session.reverse ? "flash.newReverse" : "flash.newWord")}` : t("feed.kind.review");
  const example = detail?.examples[0];

  return (
    <CardFrame label={label}>
      <div className="relative flex w-full flex-col items-center gap-4">
        {/* fața cardului; atingerea ei dezvăluie răspunsul */}
        <div data-testid="feed-face" onClick={tapFace} className="flex w-full flex-col items-center gap-4 py-2">
          {listenOnly ? (
            <AudioButton text={front} rate={settings.ttsRate} size="lg" />
          ) : (
            <div className="flex items-center gap-3">
              <p lang={fromItalian ? "it" : NATIVE_LANGUAGE} data-testid="feed-italian" className="text-4xl font-bold">
                {front}
              </p>
              {fromItalian && <AudioButton text={front} rate={settings.ttsRate} />}
            </div>
          )}
          {revealed && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <p lang={fromItalian ? NATIVE_LANGUAGE : "it"} className="text-3xl font-bold text-brand-fg">
                  {answer}
                </p>
                {!fromItalian && <AudioButton text={answer} rate={settings.ttsRate} />}
              </div>
              {example && (
                <p className="max-w-sm text-sm text-muted">
                  <span lang="it" className="italic">
                    {example.it}
                  </span>{" "}
                  — <span lang={NATIVE_LANGUAGE}>{example.ro}</span>
                </p>
              )}
              {detail?.note && <p className="max-w-sm text-sm text-muted">{detail.note}</p>}
            </div>
          )}
        </div>
        {hearted && (
          <span aria-hidden="true" className="feed-heart pointer-events-none absolute inset-0 flex items-center justify-center text-8xl">
            ❤️
          </span>
        )}
      </div>

      {!revealed && (
        <div className="flex flex-wrap justify-center gap-3">
          {listenOnly && (
            <button type="button" onClick={() => setShowText(true)} className="min-h-12 rounded-xl border-2 border-slate-300 px-5 font-semibold dark:border-slate-600">
              {t("flash.showText")}
            </button>
          )}
          <button type="button" data-reveal onClick={reveal} className="min-h-12 rounded-xl bg-brand px-5 font-semibold text-white">
            {t("flash.showAnswer")}
          </button>
          {!isNew && (
            <button type="button" onClick={() => void doRate(Rating.Good, true)} className="min-h-12 rounded-xl border-2 border-brand px-5 font-semibold text-brand-fg">
              {t("feed.know")}
            </button>
          )}
        </div>
      )}
      {revealed && !rated && (
        <div data-rating className="w-full max-w-sm">
          <RatingButtons mode={settings.ratingMode} question={t("flash.howWell")} intervals={intervals} onRate={(g) => void doRate(g)} showHint={hint} />
        </div>
      )}
    </CardFrame>
  );
}

export function ReviewCard({ item, active }: { item: Extract<FeedItem, { type: "review" }>; active: boolean }) {
  return <WordRatingCard item={item} active={active} isNew={false} cardKey={item.key} />;
}

export function NewWordCard({ item, active }: { item: Extract<FeedItem, { type: "newWord" }>; active: boolean }) {
  return <WordRatingCard item={item} active={active} isNew cardKey={item.key} />;
}
