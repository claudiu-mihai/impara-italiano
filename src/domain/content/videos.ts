/** Limbile subtitrărilor unui clip: italiana (limba învățată) și limba maternă. */
export const VIDEO_TRACK_LANGS = ["it", "ro"] as const;
export type VideoTrackLang = (typeof VIDEO_TRACK_LANGS)[number];

/** Clipul unui cuvânt, din public/video/ (indexat la build în videos.json). */
export interface WordVideo {
  src: string;
  type: "video/mp4" | "video/webm";
  poster?: string;
  tracks: { lang: VideoTrackLang; src: string }[];
}

/** Clipurile după id-ul cuvântului. */
export type WordVideos = Record<string, WordVideo>;
