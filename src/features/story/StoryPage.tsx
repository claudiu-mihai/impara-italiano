import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStories } from "../../app/stories.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import type { GeneratedStory } from "../../domain/content/schema.ts";
import type { Settings } from "../../domain/settings.ts";
import { useT } from "../../i18n/index.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { speak, stopSpeaking, useTtsStatus } from "../../services/tts.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";
import { BilingualLabel } from "../../ui/BilingualLabel.tsx";
import { primaryButton } from "../../ui/SessionDone.tsx";
import { StudyHeader } from "../../ui/StudyHeader.tsx";
import { Bubble } from "../dialogue/Bubble.tsx";
import { fallbackSpeaker, flattenStory as flatten, storyAudioUrl as audioUrl } from "./storyLines.ts";

const BACK_TO = "/learn/dialogues";

/** O poveste de ascultat: replicile apar una câte una, ca în „Ascultă” de la dialoguri, dar cu oricâte personaje și scene. */
export function StoryPage() {
  const { t } = useT();
  const { storyId = "" } = useParams();
  const stories = useStories();
  const settings = useLiveQuery(() => getSettings(db), []);

  // vocea se oprește când ieși din poveste
  useEffect(() => stopSpeaking, []);

  if (!stories || !settings) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;
  const story = stories.find((s) => s.id === storyId);
  if (!story) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t("story.notFound")}.</p>
        <Link to={BACK_TO} className="text-brand-fg underline">
          {t("story.backToList")}
        </Link>
      </div>
    );
  }
  return <StoryListen key={story.id} story={story} settings={settings} />;
}

function StoryListen({ story, settings }: { story: GeneratedStory; settings: Settings }) {
  const { t } = useT();
  const ttsReady = useTtsStatus() === "ready";
  const lines = flatten(story);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const last = useRef<HTMLDivElement>(null);
  const finished = index >= lines.length - 1;

  useEffect(() => {
    const line = lines[index]!;
    speak(line.it, settings.ttsRate, { speaker: fallbackSpeaker(story, line.speaker), audio: audioUrl(line.audio) });
    last.current?.scrollIntoView({ block: "nearest" });
    // doar la replica nouă
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const goTo = (i: number) => {
    setRevealed(false);
    setIndex(i);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <StudyHeader index={index} total={lines.length} label={t("story.progress")} exitTo={BACK_TO} />
      <h1 className="text-2xl font-bold">
        <BilingualLabel text={story.title} />
      </h1>
      <ol className="flex flex-col gap-3" aria-live="polite">
        {lines.slice(0, index + 1).flatMap((l, i) => {
          const speaker = story.speakers.find((s) => s.id === l.speaker)!;
          const audio = audioUrl(l.audio);
          const fallback = fallbackSpeaker(story, l.speaker);
          // fără nimic de ascultat (nici înregistrare, nici voce italiană) replica rămâne cu text
          const hide = i === index && settings.listenFirst && (ttsReady || audio !== undefined) && !revealed;
          const hidden = hide ? (
            <div className="flex items-center gap-2">
              <AudioButton text={l.it} rate={settings.ttsRate} size="md" speaker={fallback} audio={audio} />
              <button type="button" onClick={() => setRevealed(true)} className="min-h-12 rounded-xl border-2 border-brand px-4 font-semibold text-brand-fg">
                {t("flash.showText")}
              </button>
            </div>
          ) : undefined;

          const items = [];
          if (l.first && l.scene.title) {
            items.push(
              <li key={`scene-${i}`} data-testid="story-scene" className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                <h2 className="text-sm">
                  <BilingualLabel text={l.scene.title} />
                </h2>
              </li>,
            );
          }
          items.push(
            speaker.narrator ? (
              <li key={i} data-testid="dialogue-line" className="flex flex-col gap-1 rounded-2xl border-l-4 border-brand bg-white/60 p-3 dark:bg-slate-900/60">
                {hidden ?? (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p lang="it" className="text-lg font-medium italic">
                        {l.it}
                      </p>
                      <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
                        {l.ro}
                      </p>
                    </div>
                    <AudioButton text={l.it} rate={settings.ttsRate} size="md" speaker={fallback} audio={audio} />
                  </div>
                )}
              </li>
            ) : (
              <Bubble
                key={i}
                name={speaker.name}
                it={l.it}
                ro={l.ro}
                gender="m"
                mine={false}
                speaker={fallback}
                rate={settings.ttsRate}
                audio={audio}
                hidden={hidden}
              />
            ),
          );
          return items;
        })}
      </ol>
      <div ref={last} className="mt-auto flex flex-col gap-3">
        {finished && <p className="text-center font-semibold">{t("story.done")}</p>}
        {finished ? (
          <>
            <Link to={BACK_TO} className={`${primaryButton} w-full`}>
              {t("story.backToList")}
            </Link>
            <button type="button" onClick={() => goTo(0)} className="min-h-12 rounded-xl border-2 border-brand px-4 font-semibold text-brand-fg">
              {t("story.again")}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => goTo(index + 1)} className={`${primaryButton} w-full`}>
            {t("dialogue.next")}
          </button>
        )}
      </div>
    </div>
  );
}
