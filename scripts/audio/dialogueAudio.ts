import { createHash } from "node:crypto";
import type { Dialogue, GeneratedDialogue, GeneratedDialogueLine } from "../../src/domain/content/schema.ts";
import { resolveGender, type Gender } from "../../src/domain/dialogue/gender.ts";
import { dialogueVoice, type VoiceName } from "../../src/domain/dialogue/voices.ts";

/** Fișierele audio ale dialogurilor, servite la `/audio/dialogues/`. */
export const DIALOGUE_AUDIO_DIR = "public/audio/dialogues";

const GENDERS: Gender[] = ["m", "f"];

/** Un fișier de generat: vocea, textul rezolvat după gen și numele fișierului. */
export interface AudioJob {
  voice: VoiceName;
  text: string;
  file: string;
}

/** Numele fișierului: din voce și text, deci un text schimbat nu mai găsește fișierul vechi. */
export function audioFileName(voice: VoiceName, text: string): string {
  return `${createHash("sha256").update(`${voice}\n${text}`).digest("hex").slice(0, 16)}.mp3`;
}

function lineJob(dialogue: Pick<Dialogue, "speakers" | "you">, line: Dialogue["lines"][number], gender: Gender): AudioJob {
  const voice = dialogueVoice(dialogue, line.speaker, gender);
  const text = resolveGender(line.it, gender);
  return { voice, text, file: audioFileName(voice, text) };
}

/** Toate fișierele necesare dialogurilor (ambele genuri ale cursantului), fără dubluri. */
export function dialogueAudioJobs(dialogues: readonly Dialogue[]): AudioJob[] {
  const jobs = new Map<string, AudioJob>();
  for (const dialogue of dialogues) {
    for (const line of dialogue.lines) {
      for (const gender of GENDERS) {
        const job = lineJob(dialogue, line, gender);
        jobs.set(job.file, job);
      }
    }
  }
  return [...jobs.values()];
}

/** Dialogul cu fișierul audio al fiecărei replici, pentru fiecare gen, doar dacă fișierul există. */
export function withDialogueAudio(dialogue: GeneratedDialogue, exists: (file: string) => boolean): GeneratedDialogue {
  const lines = dialogue.lines.map((line): GeneratedDialogueLine => {
    const audio: GeneratedDialogueLine["audio"] = {};
    for (const gender of GENDERS) {
      const { file } = lineJob(dialogue, line, gender);
      if (exists(file)) audio[gender] = file;
    }
    const { audio: _, ...rest } = line;
    return Object.keys(audio).length > 0 ? { ...rest, audio } : rest;
  });
  return { ...dialogue, lines };
}
