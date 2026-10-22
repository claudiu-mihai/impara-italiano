import type { Level } from "./content/constants.ts";
import type { Direction } from "./srs/types.ts";

export type Theme = "auto" | "light" | "dark";

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
  direction: Direction;
  conjugationMode: ConjugationMode;
  ttsRate: number;
  /** `voiceURI` al vocii italiene alese; null = automat (vocea din sistem, calitatea cea mai bună). */
  ttsVoiceURI: string | null;
  /** Tema interfeței; „auto” urmează setarea sistemului. */
  theme: Theme;
  /** Sunet la răspuns corect/greșit (quiz și conjugare). */
  soundEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  level: "A1",
  newPerDay: 10,
  nounShare: 0,
  newConjPerDay: 3,
  maxReviewsPerDay: 100,
  retention: 0.9,
  direction: "it-ro",
  conjugationMode: "write",
  ttsRate: 0.9,
  ttsVoiceURI: null,
  theme: "auto",
  soundEnabled: true,
};
