import { italianText } from "../../src/domain/content/display.ts";
import type { Level } from "../../src/domain/content/constants.ts";
import type { CoreWord } from "../../src/domain/content/types.ts";
import type { VoiceName } from "../../src/domain/dialogue/voices.ts";
import { audioFileName, type AudioJob } from "./dialogueAudio.ts";

/** Fișierele audio ale cuvintelor, servite la `/audio/words/`. */
export const WORD_AUDIO_DIR = "public/audio/words";
/** Vocea cuvintelor izolate. */
export const WORD_VOICE: VoiceName = "francesco";
/** Nivelurile ale căror cuvinte au înregistrări. */
export const WORD_AUDIO_LEVELS: readonly Level[] = ["A1"];

type AudioWord = Pick<CoreWord, "it" | "pos" | "article"> & { level: Level };

/** Fișierele cuvintelor de la nivelurile cu audio, cu textul rostit în aplicație (substantivele cu articol), fără dubluri. */
export function wordAudioJobs(words: readonly AudioWord[]): AudioJob[] {
  const jobs = new Map<string, AudioJob>();
  for (const word of words) {
    if (!WORD_AUDIO_LEVELS.includes(word.level)) continue;
    const text = italianText(word);
    if (!jobs.has(text)) jobs.set(text, { voice: WORD_VOICE, text, file: audioFileName(WORD_VOICE, text) });
  }
  return [...jobs.values()];
}

/**
 * Indexul înregistrărilor: textul rostit → fișierul, relativ la `/audio/` (ex. „words/ab12….mp3”). `speak()` îl consultă
 * pentru orice frază fără înregistrare dată explicit.
 */
export function recordingsIndex(words: readonly AudioWord[], exists: (file: string) => boolean): Record<string, string> {
  const index: Record<string, string> = {};
  for (const { text, file } of wordAudioJobs(words)) if (exists(file)) index[text] = `words/${file}`;
  return index;
}
