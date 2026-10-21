import { useParams } from "react-router-dom";
import { useTopics } from "../../app/topics.ts";
import type { Topic } from "../../domain/content/schema.ts";

/** Tema din ruta curentă (`:id`): `loading` până se încarcă temele, `topic` nedefinit dacă id-ul nu există. */
export function useTopic(): { id: string; topic: Topic | undefined; loading: boolean } {
  const { id = "" } = useParams();
  const topics = useTopics();
  return { id, topic: topics?.find((t) => t.id === id), loading: topics === undefined };
}
