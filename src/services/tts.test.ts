import { afterEach, beforeEach, expect, test, vi } from "vitest";

// Mediu de browser minim: o voce italiană locală, speechSynthesis care înregistrează frazele și un Audio controlat de test.
const spoken: string[] = [];
const utterances: { text: string; onend?: () => void }[] = [];

class FakeAudio {
  static all: FakeAudio[] = [];
  playbackRate = 1;
  paused = false;
  src: string;
  /** Câte redări s-au cerut; fiecare are propria promisiune, ca un element refolosit să poată avea mai multe în zbor. */
  private plays: { resolve: () => void; reject: (e: Error) => void }[] = [];
  private listeners = new Map<string, () => void>();
  constructor(src = "") {
    this.src = src;
    FakeAudio.all.push(this);
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  play() {
    this.paused = false;
    return new Promise<void>((resolve, reject) => this.plays.push({ resolve, reject }));
  }
  pause() {
    this.paused = true;
  }
  get playCalls() {
    return this.plays.length;
  }
  /** Simulează rezultatul unei redări (implicit ultima cerută). */
  resolvePlay = (n = this.plays.length - 1) => this.plays[n]!.resolve();
  rejectPlay = (name = "NotAllowedError", n = this.plays.length - 1) =>
    this.plays[n]!.reject(Object.assign(new Error(name), { name }));
  emit = (type: string) => this.listeners.get(type)?.();
}

let tts: typeof import("./tts.ts");

beforeEach(async () => {
  spoken.length = 0;
  utterances.length = 0;
  FakeAudio.all = [];
  const speechSynthesis = {
    getVoices: () => [{ name: "Alice", lang: "it-IT", localService: true, voiceURI: "mac:alice" }],
    speak: (u: { text: string; onend?: () => void }) => {
      spoken.push(u.text);
      utterances.push(u);
    },
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
  vi.doMock("../data/generated/recordings.json", () => ({ default: { "il caffè": "words/caffe.mp3" } }));
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
  expect(audio!.playbackRate).toBeCloseTo(0.6 / 0.9);
});

test("două înregistrări la rând folosesc același element audio (deblocat o singură dată pe iOS)", () => {
  tts.speak("Prima.", 0.9, { audio: "/audio/dialogues/1.mp3" });
  tts.speak("A doua.", 0.9, { audio: "/audio/dialogues/2.mp3" });
  expect(FakeAudio.all).toHaveLength(1);
  expect(FakeAudio.all[0]!.src).toBe("/audio/dialogues/2.mp3");
});

test("unlockAudio pornește elementul refolosit și o frază goală cu vocea de sistem", () => {
  tts.unlockAudio();
  expect(FakeAudio.all).toHaveLength(1);
  expect(FakeAudio.all[0]!.playCalls).toBe(1);
  expect(spoken).toEqual([""]);
  // după deblocare, o înregistrare refolosește același element
  tts.speak("Prego.", 0.9, { audio: "/audio/dialogues/a.mp3" });
  expect(FakeAudio.all).toHaveLength(1);
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
  const [audio] = FakeAudio.all;
  // redarea întâi a fost întreruptă de a doua: eșecul ei (AbortError) nu rostește fraza cu vocea de sistem
  audio!.rejectPlay("AbortError", 0);
  audio!.resolvePlay(1);
  await flush();
  expect(spoken).toEqual([]);

  tts.stopSpeaking();
  expect(audio!.paused).toBe(true);
});

test("fără înregistrare, vocea de sistem ca înainte", () => {
  tts.speak("Ciao!");
  expect(spoken).toEqual(["Ciao!"]);
  expect(FakeAudio.all).toEqual([]);
});

test("o frază din indexul înregistrărilor (cuvintele) se redă din fișier, după ce indexul s-a încărcat", async () => {
  tts.speak("il caffè");
  // indexul încă nu e încărcat: vocea de sistem
  expect(spoken).toEqual(["il caffè"]);
  await tts.preloadRecordings();
  expect(tts.recordingFor("il caffè")).toBe("/audio/words/caffe.mp3");
  expect(tts.recordingFor("il tè")).toBeUndefined();
  tts.speak("il caffè");
  expect(FakeAudio.all.map((a) => a.src)).toEqual(["/audio/words/caffe.mp3"]);
  tts.speak("il tè");
  expect(spoken).toEqual(["il caffè", "il tè"]);
});

test("onEnd: se cheamă când se termină înregistrarea, dar nu dacă a fost înlocuită între timp", () => {
  const ended: string[] = [];
  tts.speak("A.", 0.9, { audio: "/audio/dialogues/a.mp3", onEnd: () => ended.push("A") });
  FakeAudio.all[0]!.emit("ended");
  expect(ended).toEqual(["A"]);

  tts.speak("B.", 0.9, { audio: "/audio/dialogues/b.mp3", onEnd: () => ended.push("B") });
  tts.speak("C.", 0.9, { audio: "/audio/dialogues/c.mp3" });
  FakeAudio.all[0]!.emit("ended");
  expect(ended).toEqual(["A"]);
});

test("onEnd: și la vocea de sistem, cu aceeași regulă", () => {
  const ended: string[] = [];
  tts.speak("Ciao!", 0.9, { onEnd: () => ended.push("Ciao") });
  utterances[0]!.onend!();
  expect(ended).toEqual(["Ciao"]);

  tts.speak("Prima.", 0.9, { onEnd: () => ended.push("Prima") });
  tts.speak("A doua.", 0.9);
  utterances[1]!.onend!();
  expect(ended).toEqual(["Ciao"]);
});

test("onEnd: o înregistrare care cade pe vocea de sistem tot anunță sfârșitul", async () => {
  const ended: string[] = [];
  tts.speak("Prego.", 0.9, { audio: "/audio/dialogues/lipsa.mp3", onEnd: () => ended.push("Prego") });
  FakeAudio.all[0]!.emit("error");
  utterances[0]!.onend!();
  expect(ended).toEqual(["Prego"]);
});
