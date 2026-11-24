import { afterEach, beforeEach, expect, test, vi } from "vitest";

const freqs: number[] = [];
let contexts = 0;

class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  constructor() {
    contexts++;
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  createOscillator() {
    const osc = {
      type: "",
      frequency: { value: 0 },
      connect: (node: unknown) => node,
      start() {
        freqs.push(osc.frequency.value);
      },
      stop() {},
    };
    return osc;
  }
}

let sound: typeof import("./sound.ts");

beforeEach(async () => {
  freqs.length = 0;
  contexts = 0;
  vi.stubGlobal("AudioContext", FakeContext);
  vi.resetModules();
  sound = await import("./sound.ts");
});
afterEach(() => vi.unstubAllGlobals());

test("răspuns corect cu combo: tonurile urcă cu câte un semiton pe nivel", () => {
  sound.playFeedback(true, true);
  const plain = [...freqs];
  freqs.length = 0;
  sound.playFeedback(true, true, 2);
  expect(freqs).toHaveLength(plain.length);
  freqs.forEach((f, i) => expect(f).toBeCloseTo(plain[i]! * 2 ** (2 / 12)));
});

test("cu sunetul oprit nu se creează niciun context audio", () => {
  sound.playFeedback(true, false, 3);
  expect(contexts).toBe(0);
});

test("vibrația: scurtă la corect, dublă la greșit; nimic cu sunetul oprit sau fără suport", () => {
  const vibrate = vi.fn();
  vi.stubGlobal("navigator", { vibrate });
  sound.vibrate(true, true);
  sound.vibrate(false, true);
  sound.vibrate(true, false);
  expect(vibrate.mock.calls).toEqual([[30], [[60, 40, 60]]]);

  vi.stubGlobal("navigator", {});
  expect(() => sound.vibrate(true, true)).not.toThrow();
});
