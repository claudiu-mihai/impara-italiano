import { useEffect, useState } from "react";
import { loadTopics } from "../data/content/contentStore.ts";
import type { Topic } from "../domain/content/schema.ts";

/** Încarcă (o singură dată, lazy) temele; `undefined` până se încarcă. */
export function useTopics(): Topic[] | undefined {
  const [topics, setTopics] = useState<Topic[]>();
  useEffect(() => {
    let alive = true;
    void loadTopics().then((data) => {
      if (alive) setTopics(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return topics;
}
