import { useParams } from "react-router-dom";
import { useGrammar } from "../../app/grammar.ts";
import type { GrammarTopic } from "../../domain/content/schema.ts";

/** Tema de gramatică din ruta curentă (`:id`): `loading` până se încarcă, `topic` nedefinit dacă id-ul nu există. */
export function useGrammarTopic(): { id: string; topic: GrammarTopic | undefined; loading: boolean } {
  const { id = "" } = useParams();
  const topics = useGrammar();
  return { id, topic: topics?.find((t) => t.id === id), loading: topics === undefined };
}
