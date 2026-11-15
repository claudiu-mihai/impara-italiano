import type { Level } from "../content/constants.ts";
import { isUpTo } from "../content/levels.ts";
import type { StoredCard } from "../srs/types.ts";
import { dialogueCardId, isDialogueLearned } from "./due.ts";

/** Reperele „pot să…” de pe Acasă: dialogurile de la nivelul curent și de dedesubt, bifate când sunt învățate. */
export function canDoList<T extends { id: string; level: Level }>(
  dialogues: readonly T[],
  cards: readonly StoredCard[],
  level: Level,
): { dialogue: T; learned: boolean }[] {
  const byId = new Map(cards.map((c) => [c.cardId, c]));
  return dialogues
    .filter((d) => isUpTo(d.level, level))
    .map((dialogue) => ({ dialogue, learned: isDialogueLearned(byId.get(dialogueCardId(dialogue.id))) }));
}
