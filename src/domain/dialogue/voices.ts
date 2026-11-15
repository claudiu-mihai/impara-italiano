import type { Dialogue } from "../content/schema.ts";
import type { Gender } from "./gender.ts";

/**
 * Vocile audio-ului pregenerat (Qwen3-TTS, clonate local): Francesco și Giullia sunt vocile principale, Luca și Sofia a
 * doua voce, pentru cursantul care are același gen cu celălalt personaj.
 */
export type VoiceName = "francesco" | "giullia" | "luca" | "sofia";

const MAIN: Record<Gender, VoiceName> = { m: "francesco", f: "giullia" };
const SECOND: Record<Gender, VoiceName> = { m: "luca", f: "sofia" };

/** Vocea unei replici: celălalt personaj după genul lui, cursantul după genul ales, cu altă voce când ar suna la fel. */
export function dialogueVoice(dialogue: Pick<Dialogue, "speakers" | "you">, speakerId: string, learner: Gender): VoiceName {
  const other = dialogue.speakers.find((s) => s.id !== dialogue.you);
  const otherGender: Gender = other?.gender ?? "m";
  if (speakerId !== dialogue.you) return MAIN[otherGender];
  return learner === otherGender ? SECOND[learner] : MAIN[learner];
}
