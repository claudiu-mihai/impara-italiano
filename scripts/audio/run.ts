import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { ROOT } from "../content.ts";
import type { AudioJob } from "./dialogueAudio.ts";

export interface GeneratedAudio extends AudioJob {
  seconds: number;
}

/**
 * Generează cu Qwen3-TTS fișierele care lipsesc din `outDir` și le întoarce cu durata lor. Vocile clonate și mediul Python
 * sunt în `$QWEN_TTS_DIR` (implicit ~/qwen-tts): <voce>_hd.wav și .venv cu mlx_audio.
 */
export function generateMissing(all: readonly AudioJob[], outDir: string): GeneratedAudio[] {
  const missing = all.filter((job) => !existsSync(resolve(outDir, job.file)));
  console.log(`${all.length} fișiere audio necesare, ${missing.length} de generat (${relative(ROOT, outDir)}).`);
  if (missing.length === 0) return [];

  const qwenDir = (process.env.QWEN_TTS_DIR ?? join(homedir(), "qwen-tts")).replace(/^~/, homedir());
  const python = join(qwenDir, ".venv/bin/python");
  if (!existsSync(python)) {
    console.error(`Nu găsesc ${python}. Setează QWEN_TTS_DIR spre folderul cu .venv (mlx_audio) și vocile <voce>_hd.wav.`);
    process.exit(1);
  }
  const work = mkdtempSync(join(tmpdir(), "audio-"));
  const jobsPath = join(work, "jobs.json");
  const reportPath = join(work, "report.json");
  writeFileSync(jobsPath, JSON.stringify(missing));
  const run = spawnSync(python, [resolve(ROOT, "scripts/audio/generate.py"), jobsPath, outDir, reportPath], {
    stdio: "inherit",
    env: { ...process.env, QWEN_TTS_DIR: qwenDir },
  });
  if (run.status !== 0) process.exit(run.status ?? 1);
  return JSON.parse(readFileSync(reportPath, "utf8")) as GeneratedAudio[];
}

/** Afișează fișierele de ascultat (durată neobișnuită pentru text). */
export function reportSuspicious(generated: readonly GeneratedAudio[], outDir: string, suspicious: (audio: GeneratedAudio) => boolean): void {
  if (generated.length === 0) return;
  const flagged = generated.filter(suspicious);
  console.log(`Generate: ${generated.length}. De ascultat (durată neobișnuită): ${flagged.length}.`);
  for (const { file, voice, seconds, text } of flagged) console.log(`  ${relative(ROOT, resolve(outDir, file))}  ${voice}  ${seconds}s  ${text}`);
}

/** Literele (fără spații și semne) ale unui text, pentru viteza de vorbire. */
export const letters = (text: string) => text.match(/\p{L}/gu)?.length ?? 0;
