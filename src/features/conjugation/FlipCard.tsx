import { useEffect, useState } from "react";
import { Rating, type Grade } from "ts-fsrs";
import { db } from "../../data/db/instance.ts";
import { personsOf, TENSE_LABEL } from "../../domain/content/display.ts";
import { spokenConjugation } from "../../domain/content/spokenConjugation.ts";
import { formatInterval } from "../../domain/srs/format.ts";
import { newStoredCard, previewDue } from "../../domain/srs/scheduler.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";
import type { ConjCardProps } from "./types.ts";

const BUTTONS = [
  { grade: Rating.Again, label: "Din nou", color: "bg-red-700" },
  { grade: Rating.Hard, label: "Greu", color: "bg-amber-700" },
  { grade: Rating.Good, label: "Bine", color: "bg-brand" },
  { grade: Rating.Easy, label: "Ușor", color: "bg-sky-700" },
] as const;

/** Varianta „Flip”: persoană pe față, forma pe spate, autoevaluare cu cele 4 butoane FSRS. */
export function FlipCard({ item, verb, forms, settings, onFinish }: ConjCardProps) {
  // o singură persoană pe card, ca în exemplul „parlare · passato prossimo · noi”
  const [person] = useState(() => Math.floor(Math.random() * forms.length));
  const [flipped, setFlipped] = useState(false);
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
        [Rating.Again]: formatInterval(due[Rating.Again], now),
        [Rating.Hard]: formatInterval(due[Rating.Hard], now),
        [Rating.Good]: formatInterval(due[Rating.Good], now),
        [Rating.Easy]: formatInterval(due[Rating.Easy], now),
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
      } else if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        onFinish(Number(event.key) as Grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const personLabel = personsOf(item.tense)[person]!;
  const accepted = forms[person] ?? [];
  const spoken = spokenConjugation(item.tense, person, accepted);

  return (
    <>
      <section
        className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-md dark:bg-slate-900"
        data-testid="flip-card"
      >
        <p className="text-sm text-muted">{TENSE_LABEL[item.tense]}</p>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold">{verb.it}</p>
          <AudioButton text={verb.it} rate={settings.ttsRate} size="sm" />
        </div>
        <p className="text-muted">{verb.ro}</p>
        <p className="mt-3 text-4xl font-bold text-brand-fg" data-testid="person">
          {personLabel.it}
        </p>
        {personLabel.ro !== personLabel.it && <p className="text-sm text-muted">({personLabel.ro})</p>}

        {flipped && (
          <div className="mt-4 flex flex-col items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-700" data-testid="flip-answer">
            <p className="text-3xl font-bold">{accepted.join(" / ")}</p>
            <div className="flex gap-2">
              <AudioButton text={spoken} rate={settings.ttsRate} size="sm" />
              <AudioButton text={spoken} size="sm" slow />
            </div>
          </div>
        )}
      </section>

      <div className="mt-auto">
        {flipped ? (
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Cât de bine ai știut forma?">
            {BUTTONS.map(({ grade, label, color }) => (
              <button
                key={grade}
                type="button"
                onClick={() => onFinish(grade)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl text-white ${color}`}
              >
                <span className="font-semibold">{label}</span>
                <span className="text-xs">{labels?.[grade] ?? "…"}</span>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => setFlipped(true)} className={`${primaryButton} w-full`}>
            Arată răspunsul
          </button>
        )}
      </div>
    </>
  );
}
