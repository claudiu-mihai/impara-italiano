import { useEffect, useState } from "react";
import { loadPresenteIrregular } from "../data/content/contentStore.ts";

/**
 * Verbele neregulate la prezent (încărcate o singură dată, la nevoie); `undefined` până se încarcă.
 * Cu `enabled = false` lista nu se încarcă (ex. în Dicționar, cât timp filtrul nu e activ).
 */
export function usePresenteIrregular(enabled = true): ReadonlySet<string> | undefined {
  const [set, setSet] = useState<ReadonlySet<string>>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void loadPresenteIrregular().then((data) => {
      if (alive) setSet(data);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return set;
}
