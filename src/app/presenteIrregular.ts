import { useEffect, useState } from "react";
import { loadPresenteIrregular } from "../data/content/contentStore.ts";

/** Verbele neregulate la prezent (încărcate o singură dată, la nevoie); `undefined` până se încarcă. */
export function usePresenteIrregular(): ReadonlySet<string> | undefined {
  const [set, setSet] = useState<ReadonlySet<string>>();
  useEffect(() => {
    let alive = true;
    void loadPresenteIrregular().then((data) => {
      if (alive) setSet(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return set;
}
