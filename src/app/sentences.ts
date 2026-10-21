import { useEffect, useState } from "react";
import { loadSentences } from "../data/content/contentStore.ts";
import type { Sentence } from "../domain/content/schema.ts";

/** Încarcă (o singură dată, lazy) propozițiile pentru reconstruire; `undefined` până se încarcă. */
export function useSentences(): Sentence[] | undefined {
  const [sentences, setSentences] = useState<Sentence[]>();
  useEffect(() => {
    let alive = true;
    void loadSentences().then((data) => {
      if (alive) setSentences(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return sentences;
}
