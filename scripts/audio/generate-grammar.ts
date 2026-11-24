/**
 * `npm run audio:grammar`: generează audio-ul frazelor din exercițiile de gramatică (public/audio/words/), cu vocea lui
 * Francesco, local, cu Qwen3-TTS. Listează cele cu durată suspectă, de ascultat. După generare: `npm run build:data`.
 */
import { resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { generateMissing, letters, reportSuspicious } from "./run.ts";
import { GRAMMAR_AUDIO_DIR, grammarAudioJobs } from "./grammarAudio.ts";

const { grammar, errors } = loadContent();
if (errors.length > 0) {
  console.error(`Conținut invalid (${errors.length} erori); rulează npm run validate.`);
  process.exit(1);
}
const outDir = resolve(ROOT, GRAMMAR_AUDIO_DIR);
// o frază scurtă sau o propoziție prea rapidă/lungă față de text e de ascultat
reportSuspicious(generateMissing(grammarAudioJobs(grammar), outDir), outDir, ({ text, seconds }) => {
  const n = letters(text);
  return seconds < 0.3 || n / seconds > 22 || seconds > 1.2 + n * 0.15;
});
