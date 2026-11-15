import type { Dialogue, GeneratedDialogueLine } from "../../domain/content/schema.ts";
import type { Gender } from "../../domain/dialogue/gender.ts";
import type { Speaker } from "../../services/tts.ts";

/** Indexul personajului (0 sau 1, ordinea din `speakers`), care alege vocea. */
export function speakerOf(dialogue: Pick<Dialogue, "speakers">, speakerId: string): Speaker {
  return dialogue.speakers[1].id === speakerId ? 1 : 0;
}

/** URL-ul înregistrării replicii pentru genul cursantului, dacă a fost generată (`npm run audio:dialogues`). */
export function lineAudio(line: GeneratedDialogueLine, gender: Gender): string | undefined {
  const file = line.audio?.[gender];
  return file ? `${import.meta.env.BASE_URL}audio/dialogues/${file}` : undefined;
}
