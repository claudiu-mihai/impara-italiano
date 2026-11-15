/**
 * `npm run audio:dialogues`: generează fișierele audio lipsă ale dialogurilor (public/audio/dialogues/) cu Qwen3-TTS,
 * local, apoi listează replicile cu durată suspectă, de ascultat. Vocile clonate și mediul Python sunt în
 * `$QWEN_TTS_DIR` (implicit ~/qwen-tts): <voce>_hd.wav și .venv cu mlx_audio. După generare: `npm run build:data`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadContent, ROOT } from "../content.ts";
import { DIALOGUE_AUDIO_DIR, dialogueAudioJobs, type AudioJob } from "./dialogueAudio.ts";

// litere pe secundă în afara acestui interval: replica poate fi tăiată, grăbită sau cu sunete în plus
const MIN_LETTERS_PER_SECOND = 6;
const MAX_LETTERS_PER_SECOND = 22;

const qwenDir = (process.env.QWEN_TTS_DIR ?? join(homedir(), "qwen-tts")).replace(/^~/, homedir());
const python = join(qwenDir, ".venv/bin/python");
const outDir = resolve(ROOT, DIALOGUE_AUDIO_DIR);

const { dialogues, errors } = loadContent();
if (errors.length > 0) {
  console.error(`Conținut invalid (${errors.length} erori); rulează npm run validate.`);
  process.exit(1);
}

const all = dialogueAudioJobs(dialogues);
const missing = all.filter((job) => !existsSync(resolve(outDir, job.file)));
console.log(`${all.length} fișiere audio necesare, ${missing.length} de generat.`);
if (missing.length === 0) process.exit(0);

if (!existsSync(python)) {
  console.error(`Nu găsesc ${python}. Setează QWEN_TTS_DIR spre folderul cu .venv (mlx_audio) și vocile <voce>_hd.wav.`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "audio-dialogues-"));
const jobsPath = join(work, "jobs.json");
const reportPath = join(work, "report.json");
writeFileSync(jobsPath, JSON.stringify(missing));
const run = spawnSync(python, [resolve(ROOT, "scripts/audio/generate.py"), jobsPath, outDir, reportPath], {
  stdio: "inherit",
  env: { ...process.env, QWEN_TTS_DIR: qwenDir },
});
if (run.status !== 0) process.exit(run.status ?? 1);

const report = JSON.parse(readFileSync(reportPath, "utf8")) as (AudioJob & { seconds: number })[];
const suspicious = report.filter(({ text, seconds }) => {
  const rate = (text.match(/\p{L}/gu)?.length ?? 0) / seconds;
  return rate < MIN_LETTERS_PER_SECOND || rate > MAX_LETTERS_PER_SECOND;
});
console.log(`Generate: ${report.length}. De ascultat (durată neobișnuită): ${suspicious.length}.`);
for (const { file, voice, seconds, text } of suspicious) console.log(`  ${DIALOGUE_AUDIO_DIR}/${file}  ${voice}  ${seconds}s  ${text}`);
