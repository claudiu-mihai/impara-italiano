import { afterEach, beforeEach, expect, test, vi } from "vitest";

// Mediu de browser minim: o voce italiană locală, speechSynthesis care înregistrează frazele și un Audio controlat de test.
const spoken: string[] = [];

class FakeAudio {
  static all: FakeAudio[] = [];
  playbackRate = 1;
  paused = false;
  private listeners = new Map<string, () => void>();
  private settle!: { resolve: () => void; reject: (e: Error) => void };
  readonly src: string;
  constructor(src: string) {
    this.src = src;
    FakeAudio.all.push(this);
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  play() {
    return new Promise<void>((resolve, reject) => (this.settle = { resolve, reject }));
  }
  pause() {
    this.paused = true;
  }
  /** Simulează rezultatul redării. */
  resolvePlay = () => this.settle.resolve();
  rejectPlay = (name = "NotAllowedError") => this.settle.reject(Object.assign(new Error(name), { name }));
  emit = (type: string) => this.listeners.get(type)?.();
}

let tts: typeof import("./tts.ts");

beforeEach(async () => {
  spoken.length = 0;
  FakeAudio.all = [];
  const speechSynthesis = {
    getVoices: () => [{ name: "Alice", lang: "it-IT", localService: true, voiceURI: "mac:alice" }],
    speak: (u: { text: string }) => spoken.push(u.text),
    cancel: () => {},
    addEventListener: () => {},
  };
  vi.stubGlobal("window", { speechSynthesis, addEventListener: () => {} });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      readonly text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  vi.resetModules();
  tts = await import("./tts.ts");
});

afterEach(() => vi.unstubAllGlobals());

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("cu înregistrare: se redă fișierul, cu viteza relativă la cea implicită, fără vocea de sistem", async () => {
  tts.speak("Prego.", 0.9, { audio: "/audio/dialogues/a.mp3" });
  const [audio] = FakeAudio.all;
  expect(audio!.src).toBe("/audio/dialogues/a.mp3");
  expect(audio!.playbackRate).toBe(1);
  audio!.resolvePlay();
  await flush();
  expect(spoken).toEqual([]);

  tts.speak("Prego.", 0.6, { audio: "/audio/dialogues/a.mp3" });
  expect(FakeAudio.all[1]!.playbackRate).toBeCloseTo(0.6 / 0.9);
});

test("redare blocată sau fișier lipsă: fraza se rostește cu vocea de sistem, o singură dată", async () => {
  tts.speak("Prego.", 0.9, { audio: "/audio/dialogues/lipsa.mp3" });
  const [audio] = FakeAudio.all;
  audio!.emit("error");
  audio!.rejectPlay();
  await flush();
  expect(spoken).toEqual(["Prego."]);
});

test("o redare nouă oprește înregistrarea în curs, iar eșecul ei întârziat nu mai pornește nimic", async () => {
  tts.speak("Prima.", 0.9, { audio: "/audio/dialogues/1.mp3" });
  tts.speak("A doua.", 0.9, { audio: "/audio/dialogues/2.mp3" });
  const [first, second] = FakeAudio.all;
  expect(first!.paused).toBe(true);
  first!.rejectPlay("AbortError");
  second!.resolvePlay();
  await flush();
  expect(spoken).toEqual([]);

  tts.stopSpeaking();
  expect(second!.paused).toBe(true);
});

test("fără înregistrare, vocea de sistem ca înainte", () => {
  tts.speak("Ciao!");
  expect(spoken).toEqual(["Ciao!"]);
  expect(FakeAudio.all).toEqual([]);
});
