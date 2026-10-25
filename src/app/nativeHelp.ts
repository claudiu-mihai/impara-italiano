import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db/instance.ts";
import { getSettings } from "../data/db/repositories.ts";

/** Setarea „Traducere în limba maternă” (FR7); până se citesc setările se arată doar italiana. */
export function useNativeHelp(): boolean {
  return useLiveQuery(async () => (await getSettings(db)).nativeHelp, []) ?? false;
}
