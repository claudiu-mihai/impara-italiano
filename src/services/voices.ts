/** Forma minimă a unei voci din Web Speech API; permite testarea fără browser. */
export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  voiceURI: string;
}

const normalizeLang = (lang: string) => lang.toLowerCase().replace("_", "-");

export const isItalian = (voice: VoiceInfo) => normalizeLang(voice.lang).startsWith("it");

// Unele browsere (Edge) își declară vocile neuronale din cloud ca „locale”. Le recunoaștem după nume:
// „Microsoft Elsa Online (Natural) - Italian (Italy)”, „Google italiano”.
const CLOUD_NAME = /\b(online|natural|neural)\b|google/i;

/** Voce care trimite textul pe internet (declarată ca atare sau recunoscută după nume). */
export const isCloudVoice = (voice: VoiceInfo) => !voice.localService || CLOUD_NAME.test(voice.name);

/** Voce italiană din sistemul de operare, care funcționează și fără internet. */
export const isSystemVoice = (voice: VoiceInfo) => isItalian(voice) && !isCloudVoice(voice);

export const hasLocalItalianVoice = (voices: readonly VoiceInfo[]) => voices.some(isSystemVoice);

// macOS marchează vocile de calitate superioară în nume: „Alice (Enhanced)”, „Luca (Premium)”.
const HIGH_QUALITY = /premium|enhanced|migliorat|potenziat|avanzat/i;

function score(voice: VoiceInfo): number {
  return (
    (isCloudVoice(voice) ? 0 : 100) +
    (HIGH_QUALITY.test(voice.name) ? 20 : 0) +
    (normalizeLang(voice.lang) === "it-it" ? 10 : 0)
  );
}

export interface PickVoiceOptions {
  online: boolean;
  /** `voiceURI` ales de utilizator; ignorat dacă vocea nu mai e disponibilă. */
  preferredURI?: string | null;
}

/**
 * Alege vocea italiană pentru pronunție. Vocile din sistemul de operare au prioritate:
 * funcționează și fără internet. Vocile din cloud (Google în Chrome, Microsoft „Online/Natural” în Edge)
 * se folosesc doar când nu există o voce de sistem și numai online.
 */
export function pickVoice<T extends VoiceInfo>(
  voices: readonly T[],
  { online, preferredURI }: PickVoiceOptions,
): T | undefined {
  const usable = voices.filter((v) => isItalian(v) && (online || !isCloudVoice(v)));
  const preferred = preferredURI ? usable.find((v) => v.voiceURI === preferredURI) : undefined;
  if (preferred) return preferred;
  return [...usable].sort((a, b) => score(b) - score(a))[0];
}
