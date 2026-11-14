import { useEffect, useState } from "react";
import { loadGrammar } from "../data/content/contentStore.ts";
import type { GrammarTopic } from "../domain/content/schema.ts";

/**
 * Încarcă (o singură dată, lazy) temele de gramatică, în ordinea de învățare; `undefined` până se încarcă.
 * Cu `enabled` false nu se încarcă nimic (ex. Acasă, când nu e nicio lecție de repetat).
 */
export function useGrammar(enabled = true): GrammarTopic[] | undefined {
  const [topics, setTopics] = useState<GrammarTopic[]>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void loadGrammar().then((data) => {
      if (alive) setTopics(data);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return topics;
}
