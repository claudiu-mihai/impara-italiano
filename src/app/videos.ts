import { useEffect, useState } from "react";
import { loadVideos } from "../data/content/contentStore.ts";
import type { WordVideos } from "../domain/content/videos.ts";

/** Încarcă (o singură dată, lazy) indexul clipurilor; `undefined` până se încarcă. */
export function useVideos(): WordVideos | undefined {
  const [videos, setVideos] = useState<WordVideos>();
  useEffect(() => {
    let alive = true;
    void loadVideos().then((data) => {
      if (alive) setVideos(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return videos;
}
