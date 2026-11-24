/**
 * `npm run audio:dialogues`: generează fișierele audio lipsă ale dialogurilor și ale poveștilor (public/audio/dialogues/) și ale pachetului fluxului (public/audio/feed/) cu Qwen3-TTS,
 * local, apoi listează replicile cu durată suspectă, de ascultat. După generare: `npm run build:data`.
 */
import { resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { DIALOGUE_AUDIO_DIR, dialogueAudioJobs } from "./dialogueAudio.ts";
import { FEED_AUDIO_DIR, feedAudioJobs } from "./feedAudio.ts";
import { storyAudioJobs } from "./storyAudio.ts";
import { generateMissing, letters, reportSuspicious } from "./run.ts";

// litere pe secundă în afara acestui interval: replica poate fi tăiată, grăbită sau cu sunete în plus
const MIN_LETTERS_PER_SECOND = 6;
const MAX_LETTERS_PER_SECOND = 22;

const { dialogues, stories, pack, errors } = loadContent();
if (errors.length > 0) {
  console.error(`Conținut invalid (${errors.length} erori); rulează npm run validate.`);
  process.exit(1);
}
const suspicious = ({ text, seconds }: { text: string; seconds: number }) => {
  const rate = letters(text) / seconds;
  return rate < MIN_LETTERS_PER_SECOND || rate > MAX_LETTERS_PER_SECOND;
};
const outDir = resolve(ROOT, DIALOGUE_AUDIO_DIR);
reportSuspicious(generateMissing([...dialogueAudioJobs(dialogues), ...storyAudioJobs(stories)], outDir), outDir, suspicious);
const feedDir = resolve(ROOT, FEED_AUDIO_DIR);
reportSuspicious(generateMissing(feedAudioJobs(pack), feedDir), feedDir, suspicious);
