import { useLiveQuery } from "dexie-react-hooks";
import type { Level } from "../domain/content/constants.ts";
import { db } from "../data/db/instance.ts";
import { ITALIAN_FIRST_STOPPED } from "../data/db/repositories.ts";

/** Mesajul care apare o dată, după ce „Italiană întâi” s-a oprit singură la trecerea peste nivelul A. */
export function ItalianFirstNotice({ inSettings = false }: { inSettings?: boolean }) {
  const level = useLiveQuery(async () => (await db.meta.get(ITALIAN_FIRST_STOPPED))?.value as Level | undefined, []);
  if (!level) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-amber-100 p-4 text-amber-950">
      <p className="flex-1 text-sm">
        „Italiană întâi” s-a oprit pentru nivelul {level}; o poți reporni {inSettings ? "mai jos" : "din Setări"}.
      </p>
      <button
        type="button"
        onClick={() => void db.meta.delete(ITALIAN_FIRST_STOPPED)}
        className="min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold underline"
      >
        Am înțeles
      </button>
    </div>
  );
}
