import { useEffect, useState } from "react";
import { loadWordDetails } from "../data/content/contentStore.ts";
import type { Word } from "../domain/content/schema.ts";

/** Cuvintele complete după id; `undefined` până se încarcă (lazy, o singură dată). */
export function useWordDetails(): ReadonlyMap<string, Word> | undefined {
  const [details, setDetails] = useState<ReadonlyMap<string, Word>>();
  useEffect(() => {
    let alive = true;
    void loadWordDetails().then((map) => {
      if (alive) setDetails(map);
    });
    return () => {
      alive = false;
    };
  }, []);
  return details;
}
