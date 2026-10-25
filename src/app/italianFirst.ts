import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db/instance.ts";
import { getSettings } from "../data/db/repositories.ts";

/** Setarea „Italiană întâi” (FR7); fără afișare bilingvă până se citesc setările, ca primul ecran să nu sară. */
export function useItalianFirst(): boolean {
  return useLiveQuery(async () => (await getSettings(db)).italianFirst, []) ?? false;
}
