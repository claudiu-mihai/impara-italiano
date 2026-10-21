import { useSyncExternalStore } from "react";

import { hasLocalItalianVoice, isCloudVoice, isItalian, pickVoice, type VoiceInfo } from "./voices.ts";

/**
 * - ready: se poate reda audio
 * - offline: fără conexiune și fără voce italiană locală
 * - no-voice: dispozitivul are voci, dar niciuna italiană
 * - unsupported: browserul nu are speechSynthesis
 */
export type TtsStatus = "ready" | "offline" | "no-voice" | "unsupported";

const listeners = new Set<() => void>();
let status: TtsStatus = "ready";
let italianVoices: VoiceInfo[] = [];
let preferredVoiceURI: string | null = null;
let initialized = false;

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;
const allVoices = () => (supported() ? window.speechSynthesis.getVoices() : []);

function computeStatus(): TtsStatus {
  if (!supported()) return "unsupported";
  const voices = allVoices();
  // O voce din sistem (macOS, iOS, Android, Windows) funcționează și fără internet.
  if (hasLocalItalianVoice(voices)) return "ready";
  if (!navigator.onLine) return "offline";
  // Lista de voci se poate încărca asincron (sau deloc, pe unele browsere):
  // dacă e goală încercăm oricum, iar „fără voce” se declară doar când știm sigur.
  if (voices.length > 0 && !voices.some(isItalian)) return "no-voice";
  return "ready";
}

const signature = (voices: VoiceInfo[]) => voices.map((v) => v.voiceURI).join("|");

function refresh() {
  const nextStatus = computeStatus();
  const nextVoices = allVoices().filter(isItalian);
  const changed = nextStatus !== status || signature(nextVoices) !== signature(italianVoices);
  if (!changed) return;
  status = nextStatus;
  italianVoices = nextVoices;
  for (const l of listeners) l();
}

function init() {
  if (initialized) return;
  initialized = true;
  status = computeStatus();
  italianVoices = allVoices().filter(isItalian);
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);
  if (supported()) window.speechSynthesis.addEventListener("voiceschanged", refresh);
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Vocea aleasă de utilizator în Setări (`voiceURI`); null = alegere automată. */
export function setPreferredVoice(voiceURI: string | null): void {
  preferredVoiceURI = voiceURI;
}

/** Redarea în serie activă: cine a pornit-o (`id`) și fraza care se aude acum. */
export interface Speaking {
  id: string;
  index: number;
}

let speaking: Speaking | null = null;
// crește la fiecare redare nouă, ca evenimentele întârziate ale unei serii oprite să nu mai schimbe starea
let sequenceToken = 0;

function setSpeaking(next: Speaking | null) {
  if (next?.id === speaking?.id && next?.index === speaking?.index) return;
  speaking = next;
  for (const l of listeners) l();
}

function utteranceFor(text: string, rate: number): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = rate;
  const voice = pickVoice(window.speechSynthesis.getVoices(), { online: navigator.onLine, preferredURI: preferredVoiceURI });
  if (voice) utterance.voice = voice;
  return utterance;
}

/** Oprește orice redare în curs (o frază sau o serie). */
export function stopSpeaking(): void {
  sequenceToken++;
  setSpeaking(null);
  if (supported()) window.speechSynthesis.cancel();
}

export function speak(text: string, rate = 0.9): void {
  if (computeStatus() !== "ready") return;
  stopSpeaking();
  window.speechSynthesis.speak(utteranceFor(text, rate));
}

/**
 * Citește mai multe fraze una după alta (ex. un tabel de conjugare). `id` identifică butonul care a pornit
 * seria, ca `useSpeaking()` să știe dacă redarea activă este a lui; o redare nouă o oprește pe cea în curs.
 */
export function speakSequence(id: string, texts: readonly string[], rate = 0.9): void {
  if (computeStatus() !== "ready" || texts.length === 0) return;
  stopSpeaking();
  const token = sequenceToken;
  const synth = window.speechSynthesis;
  setSpeaking({ id, index: 0 });
  texts.forEach((text, index) => {
    const utterance = utteranceFor(text, rate);
    utterance.onstart = () => {
      if (token === sequenceToken) setSpeaking({ id, index });
    };
    const last = index === texts.length - 1;
    utterance.onend = () => {
      if (last && token === sequenceToken) setSpeaking(null);
    };
    utterance.onerror = () => {
      if (token === sequenceToken) setSpeaking(null);
    };
    synth.speak(utterance);
  });
}

export interface VoiceDiagnostics {
  status: TtsStatus;
  online: boolean;
  total: number;
  /** Vocea pe care o va folosi butonul 🔊 acum. */
  chosen?: VoiceInfo;
  voices: (VoiceInfo & { cloud: boolean })[];
}

/** Ce expune browserul și ce voce s-ar alege; util când pronunția nu folosește vocea așteptată. */
export function getVoiceDiagnostics(): VoiceDiagnostics {
  const voices = allVoices();
  return {
    status: computeStatus(),
    online: typeof navigator !== "undefined" && navigator.onLine,
    total: voices.length,
    chosen: pickVoice(voices, { online: navigator.onLine, preferredURI: preferredVoiceURI }),
    voices: voices.map((v) => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      voiceURI: v.voiceURI,
      cloud: isCloudVoice(v),
    })),
  };
}

export function useTtsStatus(): TtsStatus {
  return useSyncExternalStore(subscribe, () => status, () => "ready");
}

/** Vocile italiene disponibile pe dispozitiv (pentru alegerea din Setări). */
export function useItalianVoices(): VoiceInfo[] {
  return useSyncExternalStore(subscribe, () => italianVoices, () => []);
}

/** Redarea în serie activă, sau null când nu se citește nicio serie. */
export function useSpeaking(): Speaking | null {
  return useSyncExternalStore(subscribe, () => speaking, () => null);
}
