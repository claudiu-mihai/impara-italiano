import { useEffect, useState } from "react";
import type { Grade } from "ts-fsrs";
import { Rating } from "../../domain/srs/fsrsConstants.ts";
import { db } from "../../data/db/instance.ts";
import { useT } from "../../i18n/index.ts";
import { spokenConjugation } from "../../domain/content/spokenConjugation.ts";
import { formatInterval } from "../../domain/srs/format.ts";
import { newStoredCard, previewDue } from "../../domain/srs/scheduler.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";
import { speak } from "../../services/tts.ts";
import { RatingButtons, ratingGrades, useRatingHint } from "../../ui/RatingButtons.tsx";
import { ConjPrompt } from "./ConjPrompt.tsx";
import type { ConjCardProps } from "./types.ts";

/**
 * Varianta „Cu voce tare”: cerința pe față, spui forma cu voce tare, apoi o vezi și o auzi pe spate; autoevaluare cu cele
 * 4 butoane FSRS. Alternativă egală la scris (de exemplu pentru dislexie).
 */
export function FlipCard({ item, verb, forms, ro, settings, onFinish }: ConjCardProps) {
  const { t, tp } = useT();
  // o singură persoană pe card, ca în exemplul „parlare · passato prossimo · noi”
  const [person] = useState(() => Math.floor(Math.random() * forms.length));
  const [flipped, setFlipped] = useState(false);
  const ratingHint = useRatingHint();
  const [labels, setLabels] = useState<Record<Grade, string>>();

  useEffect(() => {
    let alive = true;
    void db.cards.get(item.cardId).then((existing) => {
      if (!alive) return;
      const now = new Date();
      const card =
        existing ??
        newStoredCard({ cardId: item.cardId, wordId: item.verbId, kind: "conj", variant: item.tense }, now, studyDayOf(now));
      const due = previewDue(card, now, settings.retention);
      setLabels({
        [Rating.Again]: formatInterval(due[Rating.Again], now, tp),
        [Rating.Hard]: formatInterval(due[Rating.Hard], now, tp),
        [Rating.Good]: formatInterval(due[Rating.Good], now, tp),
        [Rating.Easy]: formatInterval(due[Rating.Easy], now, tp),
      });
    });
    return () => {
      alive = false;
    };
  }, [item.cardId, item.verbId, item.tense, settings.retention]);

  // Space/Enter răstoarnă cardul, 1–4 notează
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["BUTTON", "A", "INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!flipped && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        const grade = ratingGrades(settings.ratingMode)[Number(event.key) - 1];
        if (grade !== undefined) onFinish(grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const accepted = forms[person] ?? [];
  const spoken = spokenConjugation(item.tense, person, accepted);

  // după ce ai spus forma cu voce tare și ai întors cardul, o auzi ca să compari („Audio automat”)
  useEffect(() => {
    if (flipped && settings.autoPlayAudio) speak(spoken, settings.ttsRate);
    // doar la întoarcere
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  return (
    <>
      <ConjPrompt
        item={item}
        verb={verb}
        ro={ro}
        person={person}
        rate={settings.ttsRate}
        testId="flip-card"
        className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-md compact:gap-0.5 compact:p-2 dark:bg-slate-900"
      >
        {!flipped && (
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200" data-testid="say-aloud">
            🗣️ {t("conj.sayAloud")}
          </p>
        )}
        {flipped && (
          <div className="mt-4 flex flex-col items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700" data-testid="flip-answer">
            <p className="text-3xl font-bold">{accepted.join(" / ")}</p>
            <div className="flex gap-2">
              <AudioButton text={spoken} rate={settings.ttsRate} size="sm" />
              <AudioButton text={spoken} size="sm" slow />
            </div>
          </div>
        )}
      </ConjPrompt>

      <div className="mt-auto">
        {flipped ? (
          <RatingButtons mode={settings.ratingMode} question={t("conj.howWell")} intervals={labels} onRate={onFinish} showHint={ratingHint} />
        ) : (
          <button type="button" onClick={() => setFlipped(true)} className={`${primaryButton} w-full`}>
            {t("flash.showAnswer")}
          </button>
        )}
      </div>
    </>
  );
}
