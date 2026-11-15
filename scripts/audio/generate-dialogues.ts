/**
 * `npm run audio:dialogues`: generează fișierele audio lipsă ale dialogurilor (public/audio/dialogues/) cu Qwen3-TTS,
 * local, apoi listează replicile cu durată suspectă, de ascultat. După generare: `npm run build:data`.
 */
import { resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { DIALOGUE_AUDIO_DIR, dialogueAudioJobs } from "./dialogueAudio.ts";
import { generateMissing, letters, reportSuspicious } from "./run.ts";

// litere pe secundă în afara acestui interval: replica poate fi tăiată, grăbită sau cu sunete în plus
const MIN_LETTERS_PER_SECOND = 6;
const MAX_LETTERS_PER_SECOND = 22;

const { dialogues, errors } = loadContent();
if (errors.length > 0) {
  console.error(`Conținut invalid (${errors.length} erori); rulează npm run validate.`);
  process.exit(1);
}
const outDir = resolve(ROOT, DIALOGUE_AUDIO_DIR);
reportSuspicious(generateMissing(dialogueAudioJobs(dialogues), outDir), outDir, ({ text, seconds }) => {
  const rate = letters(text) / seconds;
  return rate < MIN_LETTERS_PER_SECOND || rate > MAX_LETTERS_PER_SECOND;
});
