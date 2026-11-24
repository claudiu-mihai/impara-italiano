import { audioFileName, type AudioJob } from "./dialogueAudio.ts";
import { WORD_AUDIO_DIR, WORD_VOICE } from "./wordAudio.ts";

/** Frazele exercițiilor de gramatică (`item.it`) stau în același folder ca audio-ul cuvintelor: numele vine din text. */
export const GRAMMAR_AUDIO_DIR = WORD_AUDIO_DIR;

/** Fișierele frazelor din exercițiile de gramatică, fără dubluri (aceeași frază apare o singură dată). */
export function grammarAudioJobs(grammar: readonly { items: readonly { it: string }[] }[]): AudioJob[] {
  const jobs = new Map<string, AudioJob>();
  for (const topic of grammar) {
    for (const item of topic.items) {
      const text = item.it;
      if (!jobs.has(text)) jobs.set(text, { voice: WORD_VOICE, text, file: audioFileName(WORD_VOICE, text) });
    }
  }
  return [...jobs.values()];
}

/** Indexul frazelor cu înregistrare: textul → `words/<fișier>`, ca indexul cuvintelor (`speak()` le caută la fel). */
export function grammarRecordingsIndex(grammar: readonly { items: readonly { it: string }[] }[], exists: (file: string) => boolean): Record<string, string> {
  const index: Record<string, string> = {};
  for (const { text, file } of grammarAudioJobs(grammar)) if (exists(file)) index[text] = `words/${file}`;
  return index;
}
