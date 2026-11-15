import { useEffect, useRef, useState } from "react";
import type { GeneratedDialogue } from "../../domain/content/schema.ts";
import { resolveGender, type Gender } from "../../domain/dialogue/gender.ts";
import type { Settings } from "../../domain/settings.ts";
import { useT } from "../../i18n/index.ts";
import { speak, useTtsStatus } from "../../services/tts.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { Bubble } from "./Bubble.tsx";
import { lineAudio, speakerOf } from "./speakers.ts";

interface ListenModeProps {
  dialogue: GeneratedDialogue;
  settings: Settings;
  gender: Gender;
  exitTo: string;
  onRolePlay: () => void;
}

/**
 * „Ascultă”: replicile apar una câte una și se aud singure. Cu „Ascultă întâi” textul replicii noi e ascuns până la
 * „Arată textul”, dacă replica se poate auzi (înregistrare sau voce de sistem); replicile deja ascultate rămân deasupra,
 * ca într-un chat.
 */
export function ListenMode({ dialogue, settings, gender, exitTo, onRolePlay }: ListenModeProps) {
  const { t } = useT();
  const ttsReady = useTtsStatus() === "ready";
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const last = useRef<HTMLDivElement>(null);
  const line = dialogue.lines[index]!;
  const finished = index >= dialogue.lines.length - 1;

  useEffect(() => {
    speak(resolveGender(line.it, gender), settings.ttsRate, { speaker: speakerOf(dialogue, line.speaker), audio: lineAudio(line, gender) });
    last.current?.scrollIntoView({ block: "nearest" });
    // doar la replica nouă
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const next = () => {
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={dialogue.lines.length} label={t("dialogue.progress")} exitTo={exitTo} />
      <ol className="flex flex-col gap-3" aria-live="polite">
        {dialogue.lines.slice(0, index + 1).map((l, i) => {
          const speaker = speakerOf(dialogue, l.speaker);
          const audio = lineAudio(l, gender);
          // fără nimic de ascultat (nici înregistrare, nici voce italiană) replica rămâne cu text
          const hide = i === index && settings.listenFirst && (ttsReady || audio !== undefined) && !revealed;
          return (
            <Bubble
              key={i}
              name={dialogue.speakers[speaker].name}
              it={l.it}
              ro={l.ro}
              gender={gender}
              mine={l.speaker === dialogue.you}
              speaker={speaker}
              rate={settings.ttsRate}
              audio={audio}
              hidden={
                hide ? (
                  <div className="flex items-center gap-2">
                    <AudioButton text={resolveGender(l.it, gender)} rate={settings.ttsRate} size="md" speaker={speaker} audio={audio} />
                    <button type="button" onClick={() => setRevealed(true)} className="min-h-12 rounded-xl border-2 border-brand px-4 font-semibold text-brand-fg">
                      {t("flash.showText")}
                    </button>
                  </div>
                ) : undefined
              }
            />
          );
        })}
      </ol>
      <div ref={last} className="mt-auto flex flex-col gap-3">
        {finished && <p className="text-center font-semibold">{t("dialogue.listenDone")}</p>}
        <button type="button" onClick={finished ? onRolePlay : next} className={`${primaryButton} w-full`}>
          {t(finished ? "dialogue.toRolePlay" : "dialogue.next")}
        </button>
      </div>
    </div>
  );
}
