import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_TRACK_LANGS, type VideoTrackLang, type WordVideos } from "../../src/domain/content/videos.ts";

/** Calea publică a clipurilor (public/video/ se copiază la build în dist/video/). */
export const VIDEO_URL = "/video/";
/** Peste această mărime un clip încarcă prea mult telefonul (se descarcă întreg, ca să meargă și offline). */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const VIDEO_TYPES = { mp4: "video/mp4", webm: "video/webm" } as const;
const POSTER_EXT = ["jpg", "jpeg", "webp", "png"];

export interface VideoFile {
  name: string;
  size: number;
  hash?: string;
}

/**
 * Indexul clipurilor din numele fișierelor: `<id>.mp4` sau `<id>.webm`, cu subtitrările opționale `<id>.it.vtt`,
 * `<id>.ro.vtt` și imaginea de previzualizare `<id>.jpg` (sau .webp, .png). `<id>` este id-ul cuvântului (ex. v-parlare).
 * Amprenta fișierului (`hash`) intră în adresă (`?v=`), ca un fișier înlocuit să nu rămână vechi în cache-ul telefonului.
 */
export function indexVideos(
  files: VideoFile[],
  wordIds: ReadonlySet<string>,
): { videos: WordVideos; errors: string[] } {
  const errors: string[] = [];
  const videos: WordVideos = {};
  const url = (file: VideoFile) => VIDEO_URL + encodeURIComponent(file.name) + (file.hash ? `?v=${file.hash}` : "");
  // macOS poate da numele cu diacriticele descompuse (NFD), iar id-urile sunt în NFC
  const entries = files.map((f) => ({ ...f, name: f.name.normalize("NFC") })).filter((f) => !f.name.startsWith("."));
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const file of entries) {
    const m = /^(.+)\.(mp4|webm)$/i.exec(file.name);
    if (!m) continue;
    const [, id, ext] = m as unknown as [string, string, string];
    if (!wordIds.has(id)) {
      errors.push(`video/${file.name}: nu există cuvântul „${id}”`);
      continue;
    }
    if (videos[id]) {
      errors.push(`video/${file.name}: cuvântul „${id}” are deja un clip (${videos[id].src})`);
      continue;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      errors.push(`video/${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB, peste limita de ${MAX_VIDEO_BYTES / 1024 / 1024} MB`);
      continue;
    }
    videos[id] = { src: url(file), type: VIDEO_TYPES[ext.toLowerCase() as keyof typeof VIDEO_TYPES], tracks: [] };
  }

  for (const file of entries) {
    if (/\.(mp4|webm)$/i.test(file.name)) continue;
    const track = /^(.+)\.([a-z]+)\.vtt$/.exec(file.name);
    const poster = /^(.+)\.([a-z]+)$/i.exec(file.name);
    if (track) {
      const [, id, lang] = track as unknown as [string, string, string];
      if (!VIDEO_TRACK_LANGS.includes(lang as VideoTrackLang)) {
        errors.push(`video/${file.name}: limba subtitrării trebuie să fie ${VIDEO_TRACK_LANGS.join(" sau ")}`);
      } else if (!videos[id]) {
        errors.push(`video/${file.name}: subtitrare fără clipul ${id}.mp4`);
      } else {
        videos[id].tracks.push({ lang: lang as VideoTrackLang, src: url(file) });
      }
    } else if (poster && POSTER_EXT.includes(poster[2]!.toLowerCase())) {
      const id = poster[1]!;
      if (!videos[id]) errors.push(`video/${file.name}: imagine fără clipul ${id}.mp4`);
      else if (videos[id].poster) errors.push(`video/${file.name}: clipul ${id} are deja o imagine`);
      else videos[id].poster = url(file);
    } else {
      errors.push(`video/${file.name}: fișier necunoscut (se acceptă .mp4, .webm, .it.vtt, .ro.vtt, .jpg, .webp, .png)`);
    }
  }

  // italiana întâi: e subtitrarea afișată implicit
  for (const video of Object.values(videos)) {
    video.tracks.sort((a, b) => VIDEO_TRACK_LANGS.indexOf(a.lang) - VIDEO_TRACK_LANGS.indexOf(b.lang));
  }
  return { videos, errors };
}

/** Fișierele din folderul de clipuri, cu mărimea și amprenta conținutului (gol dacă folderul nu există). */
export function readVideoFiles(dir: string): VideoFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile())
    .map((name) => {
      const path = join(dir, name);
      return { name, size: statSync(path).size, hash: createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 10) };
    });
}
