import { useEffect, useState } from "react";
import { loadStories } from "../data/content/contentStore.ts";
import type { GeneratedStory } from "../domain/content/schema.ts";

/** Încarcă (o singură dată, lazy) poveștile de ascultat, în ordinea nivelului; `undefined` până se încarcă. */
export function useStories(): GeneratedStory[] | undefined {
  const [stories, setStories] = useState<GeneratedStory[]>();
  useEffect(() => {
    let alive = true;
    void loadStories().then((data) => {
      if (alive) setStories(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return stories;
}
