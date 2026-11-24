import { useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../../app/content.tsx";
import { NATIVE_LANGUAGE } from "../../../domain/content/constants.ts";
import { italianText } from "../../../domain/content/display.ts";
import type { GeneratedPackItem } from "../../../domain/content/schema.ts";
import { useT } from "../../../i18n/index.ts";
import { speak, type Speaker } from "../../../services/tts.ts";
import { AudioButton } from "../../../ui/AudioButton.tsx";
import { Lupino } from "../../../ui/mascot/Lupino.tsx";
import { useAutoSpeak, useFeedEnv } from "../feedEnv.ts";
import { CardFrame } from "./CardFrame.tsx";

type Simple = Exclude<GeneratedPackItem, { kind: "micro-storia" }>;
type MicroStory = Extract<GeneratedPackItem, { kind: "micro-storia" }>;

const packAudio = (file?: string) => (file ? `${import.meta.env.BASE_URL}audio/feed/${file}` : undefined);
const linkChip = "inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3 text-sm dark:bg-slate-800";

/** Cuvintele itemului, ca legături spre fișa din dicționar. */
function WordLinks({ ids }: { ids: readonly string[] }) {
  const content = useContent();
  const words = ids.flatMap((id) => content.byId(id) ?? []);
  if (words.length === 0) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {words.map((w) => (
        <li key={w.id}>
          <Link to={`/browse/${w.id}`} lang="it" className={linkChip}>
            {italianText(w)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Expresie, idiom („modo di dire”), prieten fals, „Lo sapevi?” sau gest: textul italian cu audio, traducerea, explicația și exemplul. */
function PackItemCard({ item, active }: { item: Simple; active: boolean }) {
  const { t } = useT();
  const { settings } = useFeedEnv();
  const rate = settings.ttsRate;
  const textAudio = packAudio(item.audio?.it);
  const exampleAudio = packAudio(item.audio?.example);
  // întâi textul, apoi exemplul
  useAutoSpeak(active, () =>
    speak(item.it, rate, {
      audio: textAudio,
      onEnd: () => item.example && speak(item.example.it, rate, { audio: exampleAudio }),
    }),
  );
  return (
    <CardFrame label={t(`feed.kind.${item.kind}`)}>
      {item.id === "espr-in-bocca-al-lupo" && <Lupino pose="in-bocca-al-lupo" size={120} />}
      {item.emoji && (
        <span aria-hidden="true" className="text-6xl">
          {item.emoji}
        </span>
      )}
      <div className="flex items-center gap-3">
        <p lang="it" data-testid="feed-italian" className="text-3xl font-bold">
          {item.it}
        </p>
        <AudioButton text={item.it} rate={rate} audio={textAudio} />
      </div>
      <p lang={NATIVE_LANGUAGE} className="text-xl">
        {item.ro}
      </p>
      {item.kind === "modo-di-dire" && (
        // traducerea literală, categoria și echivalentul sunt chiar conținutul cardului: apar și fără „Traducere în limba maternă”
        <div className="flex max-w-sm flex-col gap-1">
          <p lang={NATIVE_LANGUAGE} data-testid="idiom-literal" className="text-base">
            {t("feed.idiom.literal", { text: item.literal })}
          </p>
          <p
            lang={NATIVE_LANGUAGE}
            data-testid="idiom-match"
            data-match={item.match}
            className="self-center rounded-full bg-slate-100 px-3 py-0.5 text-sm font-semibold dark:bg-slate-800"
          >
            {t(`feed.idiom.match.${item.match}`)}
          </p>
          {item.roEquivalent && (
            <p lang={NATIVE_LANGUAGE} data-testid="idiom-equivalent" className="text-base">
              {t("feed.idiom.equivalent", { text: item.roEquivalent })}
            </p>
          )}
        </div>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p lang="it" className="text-base">
          {item.explain.it}
        </p>
        {settings.nativeHelp && (
          <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
            {item.explain.ro}
          </p>
        )}
      </div>
      {item.example && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <p lang="it" className="text-base italic">
              {item.example.it}
            </p>
            <AudioButton text={item.example.it} rate={rate} size="sm" audio={exampleAudio} />
          </div>
          <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
            {item.example.ro}
          </p>
        </div>
      )}
      <WordLinks ids={item.wordIds} />
    </CardFrame>
  );
}

/** Naratorul și al doilea, al patrulea… personaj alternează cele două voci de sistem (rezerva înregistrărilor). */
function fallbackVoice(story: MicroStory, speakerId: string): Speaker {
  const characters = story.speakers.filter((s) => !s.narrator);
  return Math.max(0, characters.findIndex((s) => s.id === speakerId)) % 2 === 0 ? 0 : 1;
}

/** O micro-poveste: replicile se aud una după alta, iar poanta (ultima replică) apare după penultima sau la atingere. */
function MicroStoryCard({ item, active }: { item: MicroStory; active: boolean }) {
  const { t, language } = useT();
  const { settings } = useFeedEnv();
  const [revealed, setRevealed] = useState(false);
  const last = item.lines.length - 1;
  const playFrom = (i: number) => {
    const line = item.lines[i];
    if (!line) return;
    if (i === last) setRevealed(true);
    speak(line.it, settings.ttsRate, { speaker: fallbackVoice(item, line.speaker), audio: packAudio(line.audio), onEnd: () => playFrom(i + 1) });
  };
  useAutoSpeak(active, () => playFrom(0));
  const visible = revealed ? item.lines : item.lines.slice(0, last);
  return (
    <CardFrame label={t("feed.kind.micro-storia")}>
      <h2 lang="it" className="text-xl font-bold">
        {language === "it" ? item.title.it : item.title.ro}
      </h2>
      <ol className="flex w-full max-w-sm flex-col gap-3 text-left">
        {visible.map((line, i) => {
          const who = item.speakers.find((s) => s.id === line.speaker)!;
          return (
            <li key={i} className={`flex items-start justify-between gap-2 rounded-2xl p-3 shadow-sm ${who.narrator ? "border-l-4 border-brand bg-white/60 dark:bg-slate-900/60" : "bg-white dark:bg-slate-900"}`}>
              <div className="flex flex-col gap-1">
                {!who.narrator && <span className="text-sm font-semibold text-brand-fg">{language === "it" ? who.name.it : who.name.ro}</span>}
                <p lang="it" className={who.narrator ? "text-lg font-medium italic" : "text-lg font-medium"}>
                  {line.it}
                </p>
                <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
                  {line.ro}
                </p>
              </div>
              <AudioButton text={line.it} rate={settings.ttsRate} size="sm" speaker={fallbackVoice(item, line.speaker)} audio={packAudio(line.audio)} />
            </li>
          );
        })}
      </ol>
      {!revealed && (
        <button type="button" onClick={() => setRevealed(true)} className="min-h-12 rounded-xl border-2 border-brand px-4 py-2 font-semibold text-brand-fg">
          {t("feed.reveal")}
        </button>
      )}
      <WordLinks ids={item.wordIds} />
    </CardFrame>
  );
}

/** Un item din pachetul nou; `undefined` dacă itemul nu mai există în conținut. */
export function PackCard({ packId, active }: { packId: string; active: boolean }) {
  const { sources } = useFeedEnv();
  const item = sources.pack.find((p) => p.id === packId);
  if (!item) return null;
  return item.kind === "micro-storia" ? <MicroStoryCard item={item} active={active} /> : <PackItemCard item={item} active={active} />;
}
