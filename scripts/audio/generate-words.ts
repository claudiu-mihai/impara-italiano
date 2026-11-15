/**
 * `npm run audio:words`: generează fișierele audio lipsă ale cuvintelor A1 (public/audio/words/) cu vocea lui Francesco,
 * local, cu Qwen3-TTS, apoi listează cuvintele cu durată suspectă, de ascultat. După generare: `npm run build:data`.
 */
import { resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { generateMissing, letters, reportSuspicious } from "./run.ts";
import { WORD_AUDIO_DIR, wordAudioJobs } from "./wordAudio.ts";

const { words, errors } = loadContent();
if (errors.length > 0) {
  console.error(`Conținut invalid (${errors.length} erori); rulează npm run validate.`);
  process.exit(1);
}
const outDir = resolve(ROOT, WORD_AUDIO_DIR);
// un cuvânt izolat: prea scurt (tăiat), prea rapid sau mult prea lung (sunete în plus)
reportSuspicious(generateMissing(wordAudioJobs(words), outDir), outDir, ({ text, seconds }) => {
  const n = letters(text);
  return seconds < 0.3 || n / seconds > 22 || seconds > 1.2 + n * 0.15;
});
