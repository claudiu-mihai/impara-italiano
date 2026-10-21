import type { Grade } from "ts-fsrs";
import type { CoreWord } from "../../domain/content/types.ts";
import type { ConjItem } from "../../domain/session/buildConjugationSession.ts";
import type { Settings } from "../../domain/settings.ts";

/** Ce primește fiecare variantă de card de conjugare (Scrie, Flip, Tabel). */
export interface ConjCardProps {
  item: ConjItem;
  verb: CoreWord;
  /** Formele acceptate pentru fiecare persoană a timpului cardului. */
  forms: string[][];
  settings: Settings;
  /** Cardul s-a încheiat cu nota dată (FSRS). */
  onFinish: (grade: Grade) => void;
}

export const ACCENTS = ["à", "è", "é", "ì", "ò", "ù"];
