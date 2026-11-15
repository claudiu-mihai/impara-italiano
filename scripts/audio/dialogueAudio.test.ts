import { expect, test } from "vitest";
import type { Dialogue } from "../../src/domain/content/schema.ts";
import { audioFileName, dialogueAudioJobs, withDialogueAudio } from "./dialogueAudio.ts";

const BAR: Dialogue = {
  id: "la-bar-01",
  topicId: "la-bar",
  title: { it: "Un caffè", ro: "O cafea" },
  canDo: { it: "So ordinare al bar", ro: "Pot să comand la bar" },
  speakers: [
    { id: "barista", name: { it: "Barista", ro: "Barmanul" }, gender: "m" },
    { id: "cliente", name: { it: "Tu", ro: "Tu" } },
  ],
  you: "cliente",
  lines: [
    { speaker: "barista", it: "Ecco lo scontrino, {signore|signora}.", ro: "Poftiți bonul." },
    { speaker: "cliente", it: "Grazie!", ro: "Mulțumesc!" },
    { speaker: "barista", it: "Prego.", ro: "Cu plăcere." },
  ],
};

test("numele fișierului e stabil și depinde de voce și de text", () => {
  expect(audioFileName("francesco", "Prego.")).toMatch(/^[0-9a-f]{16}\.mp3$/);
  expect(audioFileName("francesco", "Prego.")).toBe(audioFileName("francesco", "Prego."));
  expect(audioFileName("giullia", "Prego.")).not.toBe(audioFileName("francesco", "Prego."));
  expect(audioFileName("francesco", "Prego!")).not.toBe(audioFileName("francesco", "Prego."));
});

test("joburile: textul rezolvat după gen, cu vocea fiecărei variante, fără dubluri", () => {
  const jobs = dialogueAudioJobs([BAR]);
  expect(jobs).toEqual(
    expect.arrayContaining([
      { voice: "francesco", text: "Ecco lo scontrino, signore.", file: audioFileName("francesco", "Ecco lo scontrino, signore.") },
      { voice: "francesco", text: "Ecco lo scontrino, signora.", file: audioFileName("francesco", "Ecco lo scontrino, signora.") },
      // cursantul bărbat lângă barman: a doua voce masculină; cursanta: Giullia
      { voice: "luca", text: "Grazie!", file: audioFileName("luca", "Grazie!") },
      { voice: "giullia", text: "Grazie!", file: audioFileName("giullia", "Grazie!") },
    ]),
  );
  // „Prego.” al barmanului e același pentru ambele genuri: un singur fișier
  expect(jobs.filter((j) => j.text === "Prego.")).toHaveLength(1);
  expect(jobs).toHaveLength(5);
});

test("replica primește doar fișierele care există", () => {
  const existing = new Set([audioFileName("francesco", "Prego."), audioFileName("giullia", "Grazie!")]);
  const linked = withDialogueAudio({ ...BAR, level: "A1" }, (file) => existing.has(file));
  expect(linked.lines[0]!.audio).toBeUndefined();
  expect(linked.lines[1]!.audio).toEqual({ f: audioFileName("giullia", "Grazie!") });
  expect(linked.lines[2]!.audio).toEqual({ m: audioFileName("francesco", "Prego."), f: audioFileName("francesco", "Prego.") });
  expect(linked.level).toBe("A1");
});
