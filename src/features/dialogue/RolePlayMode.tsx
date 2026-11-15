import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Grade } from "ts-fsrs";
import { db } from "../../data/db/instance.ts";
import { saveReview } from "../../data/db/repositories.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import type { GeneratedDialogue } from "../../domain/content/schema.ts";
import { resolveGender, type Gender } from "../../domain/dialogue/gender.ts";
import { dialogueCardId, dialogueCountsForSrs } from "../../domain/dialogue/due.ts";
import { reviewDialogueCard } from "../../domain/dialogue/review.ts";
import { Rating } from "../../domain/srs/fsrsConstants.ts";
import type { Settings } from "../../domain/settings.ts";
import { useT, type Key } from "../../i18n/index.ts";
import { speak } from "../../services/tts.ts";
import { primaryButton } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { Bubble, GenderedText } from "./Bubble.tsx";
import { lineAudio, speakerOf } from "./speakers.ts";

interface RolePlayModeProps {
  dialogue: GeneratedDialogue;
  settings: Settings;
  gender: Gender;
  exitTo: string;
  backLabel: string;
}

const GRADES: { grade: Grade; label: Key; hint: Key; color: string }[] = [
  { grade: Rating.Again, label: "rate.again", hint: "dialogue.gradeAgain", color: "bg-red-700" },
  { grade: Rating.Hard, label: "rate.hard", hint: "dialogue.gradeHard", color: "bg-amber-700" },
  { grade: Rating.Good, label: "rate.good", hint: "dialogue.gradeGood", color: "bg-brand" },
];

/**
 * „Joc de rol”: replicile celuilalt personaj se aud și se văd; la replica ta vezi doar ce trebuie să spui (în română),
 * o spui cu voce tare, apoi o dezvălui și o auzi. La final te notezi singur; doar primul joc de rol pe un dialog nou sau
 * scadent schimbă programul de repetare.
 */
export function RolePlayMode({ dialogue, settings, gender, exitTo, backLabel }: RolePlayModeProps) {
  const { t } = useT();
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [graded, setGraded] = useState(false);
  const [countsForSrs, setCountsForSrs] = useState<boolean>();
  const [saveFailed, setSaveFailed] = useState(false);
  const startedAt = useRef(Date.now());
  const last = useRef<HTMLDivElement>(null);
  // la final focusul trece pe notare (sau pe rezultat), ca tastatura și cititorul de ecran să nu-l piardă
  const endFocus = useRef<HTMLDivElement>(null);
  const cardId = dialogueCardId(dialogue.id);

  // se stabilește o singură dată, la intrare: un dialog notat acum nu devine „de notat” la „Încă o dată”
  useEffect(() => {
    let alive = true;
    void db.cards.get(cardId).then((card) => {
      if (alive) setCountsForSrs(dialogueCountsForSrs(card, new Date()));
    });
    return () => {
      alive = false;
    };
  }, [cardId]);

  const line = dialogue.lines[index]!;
  const mine = line.speaker === dialogue.you;
  const speaker = speakerOf(dialogue, line.speaker);

  // replica celuilalt se aude când apare; a ta, abia când o dezvălui
  useEffect(() => {
    // butoanele de jos (inclusiv notarea de la final) rămân în ecran pe măsură ce conversația crește
    last.current?.scrollIntoView({ block: "nearest" });
    if (finished) return;
    if (!mine || revealed) speak(resolveGender(line.it, gender), settings.ttsRate, { speaker, audio: lineAudio(line, gender) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, revealed, attempt, finished]);

  const next = () => {
    if (index + 1 >= dialogue.lines.length) {
      setFinished(true);
      return;
    }
    setRevealed(false);
    setIndex(index + 1);
  };

  const grade = async (value: Grade) => {
    setGraded(true);
    setSaveFailed(false);
    try {
      const now = new Date();
      const card = await db.cards.get(cardId);
      const { card: reviewed, log } = reviewDialogueCard(card, dialogue.id, value, now, settings.retention);
      await saveReview(db, reviewed, log, { source: "skill", now, durationMs: now.getTime() - startedAt.current });
    } catch {
      // notarea nu s-a salvat (ex. spațiu plin): butoanele revin, cu un mesaj
      setGraded(false);
      setSaveFailed(true);
    }
  };

  useEffect(() => {
    if (finished) endFocus.current?.focus();
  }, [finished, graded]);

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setRevealed(false);
    setFinished(false);
    // a doua încercare e exersare liberă: mesajul de final nu mai spune că s-a notat
    setGraded(false);
    startedAt.current = Date.now();
  };

  const canGrade = countsForSrs === true && attempt === 0;

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={finished ? dialogue.lines.length : index} total={dialogue.lines.length} label={t("dialogue.progress")} exitTo={exitTo} />
      <ol className="flex flex-col gap-3" aria-live="polite">
        {dialogue.lines.slice(0, index + 1).map((l, i) => {
          const s = speakerOf(dialogue, l.speaker);
          const isMine = l.speaker === dialogue.you;
          const hide = isMine && i === index && !revealed && !finished;
          return (
            <Bubble
              key={`${attempt}-${i}`}
              name={dialogue.speakers[s].name}
              it={l.it}
              ro={l.ro}
              gender={gender}
              mine={isMine}
              speaker={s}
              rate={settings.ttsRate}
              audio={lineAudio(l, gender)}
              hidden={
                hide ? (
                  <div data-testid="say-line" className="flex flex-col gap-1">
                    <p className="text-sm text-muted">🗣️ {t("dialogue.sayIt")}</p>
                    <p lang={NATIVE_LANGUAGE} className="text-lg font-medium">
                      <GenderedText text={l.ro} gender={gender} />
                    </p>
                  </div>
                ) : undefined
              }
            />
          );
        })}
      </ol>

      <div ref={last} className="mt-auto flex flex-col gap-3">
        {!finished ? (
          mine && !revealed ? (
            <button type="button" onClick={() => setRevealed(true)} className={`${primaryButton} w-full`}>
              {t("dialogue.reveal")}
            </button>
          ) : (
            <button type="button" onClick={next} className={`${primaryButton} w-full`}>
              {t("common.continue")}
            </button>
          )
        ) : canGrade && !graded ? (
          <>
            <p className="text-center font-semibold">{t("dialogue.howWell")}</p>
            {saveFailed && (
              <p role="alert" className="text-center font-semibold text-red-700 dark:text-red-400">
                {t("dialogue.saveFailed")}
              </p>
            )}
            <div ref={endFocus} tabIndex={-1} className="grid grid-cols-3 gap-2 outline-none" role="group" aria-label={t("dialogue.howWell")}>
              {GRADES.map(({ grade: value, label, hint, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void grade(value)}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-white ${color}`}
                >
                  <span className="font-semibold">{t(label)}</span>
                  <span className="text-xs">{t(hint)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div ref={endFocus} tabIndex={-1} aria-live="polite" className="outline-none">
              <p className="text-center font-semibold">{t("dialogue.done")}</p>
              <p className="text-center text-muted" data-testid="dialogue-result">
                {graded ? t("dialogue.reviewNoted") : t("skill.freePractice")}
              </p>
            </div>
            <button type="button" onClick={restart} className={`${primaryButton} w-full`}>
              {t("dialogue.oneMore")}
            </button>
            <Link to={exitTo} className="min-h-12 text-center font-semibold text-brand-fg underline">
              {backLabel}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
