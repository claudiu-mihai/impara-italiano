import { useEffect, useState } from "react";
import { loadGrammar } from "../data/content/contentStore.ts";
import type { GrammarTopic } from "../domain/content/schema.ts";

/** Încarcă (o singură dată, lazy) temele de gramatică, în ordinea de învățare; `undefined` până se încarcă. */
export function useGrammar(): GrammarTopic[] | undefined {
  const [topics, setTopics] = useState<GrammarTopic[]>();
  useEffect(() => {
    let alive = true;
    void loadGrammar().then((data) => {
      if (alive) setTopics(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return topics;
}
