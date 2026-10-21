import type { Level, Pos } from "./constants.ts";

/**
 * Datele minime ale unui cuvânt: tot ce trebuie pentru liste, căutare, quiz și sesiuni.
 * Exemplele, notele și formele (`Word`) se încarcă separat, doar când un ecran le afișează.
 */
export interface CoreWord {
  id: string;
  it: string;
  ro: string;
  pos: Pos;
  rank: number;
  /** Nivelul CEFR estimat (din frecvență, cu corecturi manuale). */
  level: Level;
  /** Doar la substantive: articolul hotărât, necesar ca să se afișeze „il libro”, „l'amico”. */
  article?: "il" | "lo" | "la" | "l'";
}
