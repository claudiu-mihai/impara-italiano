import type { GeneratedStory } from "../../domain/content/schema.ts";
import type { Speaker } from "../../services/tts.ts";

/** Replicile poveștii într-un șir, fiecare cu scena ei (titlul scenei apare înaintea primei replici a scenei). */
export function flattenStory(story: GeneratedStory) {
  return story.scenes.flatMap((scene) => scene.lines.map((line, i) => ({ ...line, scene, first: i === 0 })));
}

/** Vocea de rezervă (sistem) a personajului: naratorul și al doilea, al patrulea… personaj alternează cele două voci. */
export function fallbackSpeaker(story: GeneratedStory, speakerId: string): Speaker {
  const characters = story.speakers.filter((s) => !s.narrator);
  return Math.max(0, characters.findIndex((s) => s.id === speakerId)) % 2 === 0 ? 0 : 1;
}

/** URL-ul înregistrării unei replici de poveste (aceleași fișiere ca la dialoguri). */
export const storyAudioUrl = (file?: string) => (file ? `${import.meta.env.BASE_URL}audio/dialogues/${file}` : undefined);
