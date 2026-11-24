import type { Localized } from "../../domain/content/schema.ts";
import { resolveGender, type Gender } from "../../domain/dialogue/gender.ts";
import type { FeedSources } from "../../domain/feed/buildFeedBatch.ts";
import type { FeedItem } from "../../domain/feed/types.ts";
import type { Speaker } from "../../services/tts.ts";
import { lineAudio, speakerOf } from "../dialogue/speakers.ts";
import { fallbackSpeaker, flattenStory, storyAudioUrl } from "../story/storyLines.ts";

export interface FeedLine {
  /** Replica italiană, cu genul rezolvat (la dialoguri). */
  text: string;
  ro: string;
  name: Localized;
  narrator: boolean;
  speaker: Speaker;
  audio?: string;
}

export interface FeedLines {
  kind: "dialogue" | "story";
  lines: FeedLine[];
  /** Pagina dialogului sau a poveștii. */
  link: string;
}

/** Replicile unui card „lines” (2–3 replici consecutive dintr-un dialog sau dintr-o poveste); `undefined` dacă sursa nu mai există. */
export function feedLines(item: Extract<FeedItem, { type: "lines" }>, sources: FeedSources, gender: Gender): FeedLines | undefined {
  const { sourceId, start, count } = item;
  if (item.source === "dialogue") {
    const dialogue = sources.dialogues.find((d) => d.id === sourceId);
    if (!dialogue) return undefined;
    return {
      kind: "dialogue",
      link: `/learn/topics/${dialogue.topicId}/dialogue/${dialogue.id}`,
      lines: dialogue.lines.slice(start, start + count).map((l) => {
        const speaker = speakerOf(dialogue, l.speaker);
        return {
          text: resolveGender(l.it, gender),
          ro: resolveGender(l.ro, gender),
          name: dialogue.speakers[speaker].name,
          narrator: false,
          speaker,
          audio: lineAudio(l, gender),
        };
      }),
    };
  }
  const story = sources.stories.find((s) => s.id === sourceId);
  if (!story) return undefined;
  return {
    kind: "story",
    link: `/learn/stories/${story.id}`,
    lines: flattenStory(story)
      .slice(start, start + count)
      .map((l) => {
        const who = story.speakers.find((s) => s.id === l.speaker)!;
        return { text: l.it, ro: l.ro, name: who.name, narrator: !!who.narrator, speaker: fallbackSpeaker(story, l.speaker), audio: storyAudioUrl(l.audio) };
      }),
  };
}
