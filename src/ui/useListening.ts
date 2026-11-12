import { useTtsStatus } from "../services/tts.ts";

/**
 * „Ascultă întâi” e activ doar când setarea e pornită și dispozitivul poate reda italiană acum. Fără voce, fără suport sau
 * fără internet (și fără voce locală) exercițiile rămân cu text, ca să nu rămână o întrebare imposibil de rezolvat.
 */
export function useListening(listenFirst: boolean): boolean {
  const status = useTtsStatus();
  return listenFirst && status === "ready";
}
