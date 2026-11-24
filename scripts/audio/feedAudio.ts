import type { GeneratedPackItem, PackItem } from "../../src/domain/content/schema.ts";
import type { VoiceName } from "../../src/domain/dialogue/voices.ts";
import { audioFileName, type AudioJob } from "./dialogueAudio.ts";

/** Fișierele audio ale pachetului fluxului, servite la `/audio/feed/`. */
export const FEED_AUDIO_DIR = "public/audio/feed";

/** Vocea itemilor simpli (textul italian și exemplul); micro-poveștile folosesc vocile personajelor. */
export const FEED_VOICE: VoiceName = "francesco";

const job = (voice: VoiceName, text: string): AudioJob => ({ voice, text, file: audioFileName(voice, text) });

/** Toate fișierele necesare pachetului, fără dubluri. */
export function feedAudioJobs(items: readonly PackItem[]): AudioJob[] {
  const jobs = new Map<string, AudioJob>();
  const add = (voice: VoiceName, text: string) => {
    const j = job(voice, text);
    jobs.set(j.file, j);
  };
  for (const item of items) {
    if (item.kind === "micro-storia") {
      for (const line of item.lines) add(item.speakers.find((s) => s.id === line.speaker)!.voice, line.it);
    } else {
      add(FEED_VOICE, item.it);
      if (item.example) add(FEED_VOICE, item.example.it);
    }
  }
  return [...jobs.values()];
}

/** Itemul cu fișierele audio care există; fără niciun fișier, itemul rămâne fără câmpul `audio`. */
export function withFeedAudio(item: GeneratedPackItem, exists: (file: string) => boolean): GeneratedPackItem {
  if (item.kind === "micro-storia") {
    return {
      ...item,
      lines: item.lines.map((line) => {
        const { file } = job(item.speakers.find((s) => s.id === line.speaker)!.voice, line.it);
        const { audio: _, ...rest } = line;
        return exists(file) ? { ...rest, audio: file } : rest;
      }),
    };
  }
  const audio: { it?: string; example?: string } = {};
  const textFile = job(FEED_VOICE, item.it).file;
  if (exists(textFile)) audio.it = textFile;
  if (item.example) {
    const exampleFile = job(FEED_VOICE, item.example.it).file;
    if (exists(exampleFile)) audio.example = exampleFile;
  }
  const { audio: _, ...rest } = item;
  return Object.keys(audio).length > 0 ? { ...rest, audio } : rest;
}
