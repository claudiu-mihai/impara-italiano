import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db/instance.ts";
import { loadConjugationOverview, type ConjugationOverview } from "../data/queries.ts";
import { useConjugations } from "./conjugations.ts";
import { useContent } from "./content.tsx";

/**
 * Conjugările de făcut azi (repetiții și timpuri noi); `undefined` până se încarcă formele conjugate. Se folosește
 * doar în ecranele care le arată, ca formele (un fișier mare) să nu se încarce la pornire.
 */
export function useConjugationToday(): ConjugationOverview | undefined {
  const content = useContent();
  const conjugations = useConjugations();
  return useLiveQuery(
    () => (conjugations ? loadConjugationOverview(db, content, conjugations) : undefined),
    [content, conjugations],
  );
}
