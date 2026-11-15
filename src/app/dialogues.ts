import { useEffect, useState } from "react";
import { loadDialogues } from "../data/content/contentStore.ts";
import type { GeneratedDialogue } from "../domain/content/schema.ts";

/**
 * Încarcă (o singură dată, lazy) dialogurile, în ordinea temelor; `undefined` până se încarcă.
 * Cu `enabled` false nu se încarcă nimic (ex. Acasă, fără niciun card de dialog).
 */
export function useDialogues(enabled = true): GeneratedDialogue[] | undefined {
  const [dialogues, setDialogues] = useState<GeneratedDialogue[]>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void loadDialogues().then((data) => {
      if (alive) setDialogues(data);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return dialogues;
}
