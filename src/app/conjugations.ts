import { useEffect, useState } from "react";
import { loadConjugations } from "../data/content/contentStore.ts";
import type { Conjugations } from "../domain/content/schema.ts";

/** Încarcă (o singură dată, lazy) formele conjugate; `undefined` până se încarcă. */
export function useConjugations(): Conjugations | undefined {
  const [conjugations, setConjugations] = useState<Conjugations>();
  useEffect(() => {
    let alive = true;
    void loadConjugations().then((data) => {
      if (alive) setConjugations(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return conjugations;
}
