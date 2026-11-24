import { useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../../../app/content.tsx";
import { NATIVE_LANGUAGE } from "../../../domain/content/constants.ts";
import { italianText } from "../../../domain/content/display.ts";
import { plainText } from "../../../domain/grammar/markup.ts";
import type { FeedItem } from "../../../domain/feed/types.ts";
import { useT } from "../../../i18n/index.ts";
import { speak } from "../../../services/tts.ts";
import { AudioButton } from "../../../ui/AudioButton.tsx";
import { InlineText } from "../../grammar/InlineText.tsx";
import { useAutoSpeak, useFeedEnv } from "../feedEnv.ts";
import { feedLines, type FeedLine } from "../lineSource.ts";
import { CardFrame } from "./CardFrame.tsx";

type Of<T extends FeedItem["type"]> = Extract<FeedItem, { type: T }>;
interface CardProps {
  active: boolean;
}

const linkButton = "min-h-12 rounded-xl border-2 border-brand px-4 py-2 font-semibold text-brand-fg";

/** Un cuvânt deja început: cuvântul, traducerea, primul exemplu și nota, cu audio. */
export function KnownWordCard({ item, active }: CardProps & { item: Of<"knownWord"> }) {
  const { t } = useT();
  const content = useContent();
  const { sources, settings } = useFeedEnv();
  const word = content.byId(item.wordId);
  const detail = sources.details.get(item.wordId);
  const example = detail?.examples[0];
  useAutoSpeak(active, () => word && speak(italianText(word), settings.ttsRate));
  if (!word) return null;
  return (
    <CardFrame label={t("feed.kind.knownWord")}>
      <div className="flex items-center gap-3">
        <Link to={`/browse/${word.id}`} lang="it" data-testid="feed-italian" className="text-5xl font-bold">
          {italianText(word)}
        </Link>
        <AudioButton text={italianText(word)} rate={settings.ttsRate} />
      </div>
      <p lang={NATIVE_LANGUAGE} className="text-2xl">
        {word.ro}
      </p>
      {example && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <p lang="it" className="text-lg italic">
              {example.it}
            </p>
            <AudioButton text={example.it} rate={settings.ttsRate} size="sm" />
          </div>
          <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
            {example.ro}
          </p>
        </div>
      )}
      {detail?.note && <p className="max-w-sm text-sm text-muted">{detail.note}</p>}
    </CardFrame>
  );
}

/** O propoziție cu toate cuvintele începute: italiana se aude, traducerea apare la atingere. */
export function SentenceCard({ item, active }: CardProps & { item: Of<"sentence"> }) {
  const { t } = useT();
  const { sentenceById, settings } = useFeedEnv();
  const [shown, setShown] = useState(false);
  const sentence = sentenceById.get(item.sentenceId);
  useAutoSpeak(active, () => sentence && speak(sentence.it, settings.ttsRate));
  if (!sentence) return null;
  return (
    <CardFrame label={t("feed.kind.sentence")}>
      <div className="flex items-center gap-3">
        <p lang="it" data-testid="feed-italian" className="text-3xl font-bold">
          {sentence.it}
        </p>
        <AudioButton text={sentence.it} rate={settings.ttsRate} />
      </div>
      {shown ? (
        <p lang={NATIVE_LANGUAGE} className="text-xl">
          {sentence.ro}
        </p>
      ) : (
        <button type="button" onClick={() => setShown(true)} className={linkButton}>
          {t("feed.showTranslation")}
        </button>
      )}
    </CardFrame>
  );
}

/** O regulă din lecțiile de gramatică, în italiană, cu traducerea după „Traducere în limba maternă”. */
export function RuleCard({ item, active }: CardProps & { item: Of<"rule"> }) {
  const { t } = useT();
  const { sources, settings } = useFeedEnv();
  const topic = sources.grammar.find((g) => g.id === item.grammarId);
  const rule = topic?.rules[item.ruleIndex];
  useAutoSpeak(active, () => rule && speak(plainText(rule.it), settings.ttsRate));
  if (!topic || !rule) return null;
  return (
    <CardFrame label={t("feed.kind.rule")}>
      <h2 lang="it" className="text-xl font-bold">
        {topic.title.it}
      </h2>
      <div className="flex items-start gap-3">
        <p lang="it" data-testid="feed-italian" className="max-w-sm text-lg">
          <InlineText text={rule.it} />
        </p>
        <AudioButton text={plainText(rule.it)} rate={settings.ttsRate} size="sm" />
      </div>
      {settings.nativeHelp && (
        <p lang={NATIVE_LANGUAGE} className="max-w-sm text-sm text-muted">
          <InlineText text={rule.ro} />
        </p>
      )}
      <Link to={`/learn/grammar/${topic.id}`} className={linkButton}>
        {t("feed.openLesson")}
      </Link>
    </CardFrame>
  );
}

/** 2–3 replici consecutive dintr-un dialog sau dintr-o poveste, redate una după alta. */
export function LinesCard({ item, active }: CardProps & { item: Of<"lines"> }) {
  const { t, language } = useT();
  const { sources, settings } = useFeedEnv();
  const found = feedLines(item, sources, settings.learnerGender);
  const playFrom = (lines: FeedLine[], i: number) => {
    const line = lines[i];
    if (line) speak(line.text, settings.ttsRate, { speaker: line.speaker, audio: line.audio, onEnd: () => playFrom(lines, i + 1) });
  };
  useAutoSpeak(active, () => found && playFrom(found.lines, 0));
  if (!found) return null;
  return (
    <CardFrame label={t(found.kind === "dialogue" ? "feed.kind.dialogue" : "feed.kind.story")}>
      <ol className="flex w-full max-w-sm flex-col gap-3 text-left">
        {found.lines.map((line, i) => (
          <li key={i} className={`flex items-start justify-between gap-2 rounded-2xl p-3 shadow-sm ${line.narrator ? "border-l-4 border-brand bg-white/60 dark:bg-slate-900/60" : "bg-white dark:bg-slate-900"}`}>
            <div className="flex flex-col gap-1">
              {!line.narrator && <span className="text-sm font-semibold text-brand-fg">{language === "it" ? line.name.it : line.name.ro}</span>}
              <p lang="it" className={line.narrator ? "text-lg font-medium italic" : "text-lg font-medium"}>
                {line.text}
              </p>
              <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
                {line.ro}
              </p>
            </div>
            <AudioButton text={line.text} rate={settings.ttsRate} size="sm" speaker={line.speaker} audio={line.audio} />
          </li>
        ))}
      </ol>
      <Link to={found.link} className={linkButton}>
        {t(found.kind === "dialogue" ? "feed.openDialogue" : "feed.openStory")}
      </Link>
    </CardFrame>
  );
}

/** O notă sau un prieten fals dintr-un cuvânt: cuvântul, explicația și exemplul. */
export function DidYouKnowCard({ item, active }: CardProps & { item: Of<"didYouKnow"> }) {
  const { t } = useT();
  const content = useContent();
  const { sources, settings } = useFeedEnv();
  const word = content.byId(item.wordId);
  const detail = sources.details.get(item.wordId);
  const text = detail?.[item.field];
  const example = detail?.examples[0];
  useAutoSpeak(active, () => word && speak(italianText(word), settings.ttsRate));
  if (!word || !text) return null;
  return (
    <CardFrame label={t(item.field === "falseFriend" ? "feed.falseFriend" : "feed.didYouKnow")}>
      <div className="flex items-center gap-3">
        <Link to={`/browse/${word.id}`} lang="it" data-testid="feed-italian" className="text-4xl font-bold">
          {italianText(word)}
        </Link>
        <AudioButton text={italianText(word)} rate={settings.ttsRate} />
      </div>
      <p lang={NATIVE_LANGUAGE} className="text-xl">
        {word.ro}
      </p>
      <p className="max-w-sm text-base">{text}</p>
      {example && (
        <p lang="it" className="text-base italic text-muted">
          {example.it}
        </p>
      )}
    </CardFrame>
  );
}
