import type { Grade } from "ts-fsrs";
import type { RoVerb } from "../../domain/conjugation/romanian.ts";
import type { CoreWord } from "../../domain/content/types.ts";
import type { ConjItem } from "../../domain/session/buildConjugationSession.ts";
import type { Settings } from "../../domain/settings.ts";

/** Ce primește fiecare variantă de card de conjugare (Scrie, Cu voce tare, Tabel). */
export interface ConjCardProps {
  item: ConjItem;
  verb: CoreWord;
  /** Formele acceptate pentru fiecare persoană a timpului cardului. */
  forms: string[][];
  /** Formele românești ale verbului (cerința cu traducere); lipsesc la verbele din afara listei de conjugare activă. */
  ro?: RoVerb;
  settings: Settings;
  /** Cardul s-a încheiat cu nota dată (FSRS). */
  onFinish: (grade: Grade) => void;
}

export const ACCENTS = ["à", "è", "é", "ì", "ò", "ù"];
