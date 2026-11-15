import type { Dialogue } from "../../domain/content/schema.ts";
import type { Speaker } from "../../services/tts.ts";

/** Indexul personajului (0 sau 1, ordinea din `speakers`), care alege vocea. */
export function speakerOf(dialogue: Pick<Dialogue, "speakers">, speakerId: string): Speaker {
  return dialogue.speakers[1].id === speakerId ? 1 : 0;
}
