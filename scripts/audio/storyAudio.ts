import type { GeneratedStory, Story } from "../../src/domain/content/schema.ts";
import { audioFileName, type AudioJob } from "./dialogueAudio.ts";

/** Vocea personajului și numele fișierului pentru o replică (aceleași fișiere ca ale dialogurilor, în același folder). */
function lineJob(story: Story, speakerId: string, text: string): AudioJob {
  const voice = story.speakers.find((s) => s.id === speakerId)!.voice;
  return { voice, text, file: audioFileName(voice, text) };
}

/** Toate fișierele necesare poveștilor, fără dubluri. */
export function storyAudioJobs(stories: readonly Story[]): AudioJob[] {
  const jobs = new Map<string, AudioJob>();
  for (const story of stories) {
    for (const scene of story.scenes) {
      for (const line of scene.lines) {
        const job = lineJob(story, line.speaker, line.it);
        jobs.set(job.file, job);
      }
    }
  }
  return [...jobs.values()];
}

/** Povestea cu fișierul audio al fiecărei replici, doar dacă fișierul există. */
export function withStoryAudio(story: Story, exists: (file: string) => boolean): GeneratedStory {
  return {
    ...story,
    scenes: story.scenes.map((scene) => ({
      ...scene,
      lines: scene.lines.map((line) => {
        const { file } = lineJob(story, line.speaker, line.it);
        return exists(file) ? { ...line, audio: file } : line;
      }),
    })),
  };
}
