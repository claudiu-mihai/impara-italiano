import { expect, test } from "vitest";
import type { Story } from "../../src/domain/content/schema.ts";
import { audioFileName } from "./dialogueAudio.ts";
import { storyAudioJobs, withStoryAudio } from "./storyAudio.ts";

const STORY: Story = {
  id: "una-pausa-al-bar-01",
  level: "A2",
  title: { it: "Una pausa al bar", ro: "O pauză la bar" },
  speakers: [
    { id: "narratore", name: { it: "Narratore", ro: "Naratorul" }, voice: "francesco", narrator: true },
    { id: "marta", name: { it: "Marta", ro: "Marta" }, voice: "sofia" },
  ],
  scenes: [
    { lines: [{ speaker: "narratore", it: "Al bar.", ro: "La bar." }, { speaker: "marta", it: "Che caffè!", ro: "Ce cafea!" }] },
    { title: { it: "Dopo", ro: "După" }, lines: [{ speaker: "marta", it: "Che caffè!", ro: "Ce cafea!" }] },
  ],
};

test("joburile: vocea fiecărui personaj, textul italian, fără dubluri", () => {
  expect(storyAudioJobs([STORY])).toEqual([
    { voice: "francesco", text: "Al bar.", file: audioFileName("francesco", "Al bar.") },
    { voice: "sofia", text: "Che caffè!", file: audioFileName("sofia", "Che caffè!") },
  ]);
});

test("replica primește doar fișierul care există", () => {
  const linked = withStoryAudio(STORY, (file) => file === audioFileName("sofia", "Che caffè!"));
  expect(linked.scenes[0]!.lines[0]!.audio).toBeUndefined();
  expect(linked.scenes[0]!.lines[1]!.audio).toBe(audioFileName("sofia", "Che caffè!"));
  expect(linked.scenes[1]!.lines[0]!.audio).toBe(audioFileName("sofia", "Che caffè!"));
  expect(linked.scenes[1]!.title).toEqual({ it: "Dopo", ro: "După" });
});
