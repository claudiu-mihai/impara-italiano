import type { Level, UiLanguage } from "./content/constants.ts";
import { levelGroupOf } from "./content/levels.ts";
import type { Direction } from "./srs/types.ts";

export type Theme = "auto" | "light" | "dark";

/** Direcția cardurilor de vocabular: una singură sau ambele (a doua direcție se deblochează după prima). */
export type StudyDirection = Direction | "both";

/** Varianta cardurilor de conjugare: scrii pe rând, autoevaluare (Flip) sau tot tabelul deodată. */
export type ConjugationMode = "write" | "flip" | "table";

export interface Settings {
  /** Nivelul curent: se învață cuvinte și timpuri noi doar până la acest nivel. */
  level: Level;
  /** Cuvinte (carduri) noi introduse pe zi. */
  newPerDay: number;
  /** Procentul de substantive printre cuvintele noi de conținut (0 = ordinea frecvenței, fără preferință). */
  nounShare: number;
  /** Timpuri verbale (carduri de conjugare) noi pe zi. */
  newConjPerDay: number;
  /** Limita zilnică de repetiții. */
  maxReviewsPerDay: number;
  /** Retenția țintă FSRS (0.8–0.95). */
  retention: number;
  direction: StudyDirection;
  /** În modul „ambele”: câte carduri din a doua direcție (de obicei RO → IT) se deblochează pe zi. */
  newReversePerDay: number;
  conjugationMode: ConjugationMode;
  ttsRate: number;
  /** `voiceURI` al vocii italiene alese; null = automat (vocea din sistem, calitatea cea mai bună). */
  ttsVoiceURI: string | null;
  /** Tema interfeței; „auto” urmează setarea sistemului. */
  theme: Theme;
  /** Sunet la răspuns corect/greșit (quiz și conjugare). */
  soundEnabled: boolean;
  /**
   * „Traducere în limba maternă” (FR7): sub italiana din Teme apare traducerea, iar „De reținut” are și fața în limba
   * maternă. Oprită: doar italiana.
   */
  nativeHelp: boolean;
  /** Limba interfeței (FR8); independentă de limba maternă și de nivel. */
  uiLanguage: UiLanguage;
}

export const DEFAULT_SETTINGS: Settings = {
  level: "A1",
  newPerDay: 10,
  nounShare: 0,
  newConjPerDay: 3,
  maxReviewsPerDay: 100,
  retention: 0.9,
  direction: "it-ro",
  newReversePerDay: 10,
  conjugationMode: "write",
  ttsRate: 0.9,
  ttsVoiceURI: null,
  theme: "auto",
  soundEnabled: true,
  nativeHelp: true,
  uiLanguage: "ro",
};

/**
 * Setările salvate, completate cu valorile implicite. „Traducere în limba maternă” lipsește din setările vechi (sau din backup-uri
 * vechi): acolo se pornește doar dacă nivelul salvat este A, ca la o instalare nouă.
 */
export function withSettingDefaults(saved: Partial<Settings>): Settings {
  const level = saved.level ?? DEFAULT_SETTINGS.level;
  return { ...DEFAULT_SETTINGS, nativeHelp: levelGroupOf(level) === "A", ...saved };
}

/**
 * Setările după schimbarea nivelului. „Traducere în limba maternă” se oprește când nivelul trece de A (A2 → B1 sau mai sus);
 * revenirea la A nu o repornește, iar dacă a fost pornită manual la B1 sau mai sus, rămâne pornită.
 */
export function settingsForLevel(settings: Settings, level: Level): Settings {
  const leavesA = levelGroupOf(settings.level) === "A" && levelGroupOf(level) !== "A";
  return { ...settings, level, nativeHelp: leavesA ? false : settings.nativeHelp };
}
