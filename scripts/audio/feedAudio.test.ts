import { expect, test } from "vitest";
import type { GeneratedPackItem, PackItem } from "../../src/domain/content/schema.ts";
import { audioFileName } from "./dialogueAudio.ts";
import { FEED_VOICE, feedAudioJobs, withFeedAudio } from "./feedAudio.ts";

const loc = (it: string) => ({ it, ro: it });

const simple = (id: string, it: string, example?: string): PackItem => ({
  id,
  kind: "espressione",
  level: "A1",
  it,
  ro: it,
  explain: loc("x"),
  wordIds: [],
  ...(example ? { example: loc(example) } : {}),
});

const story: PackItem = {
  id: "stor-a",
  kind: "micro-storia",
  level: "A1",
  title: loc("Un caffè"),
  speakers: [
    { id: "voce", name: loc("N"), voice: "francesco", narrator: true },
    { id: "lei", name: loc("L"), voice: "sofia" },
  ],
  lines: [
    { speaker: "voce", it: "Al bar.", ro: "La bar." },
    { speaker: "lei", it: "Che caffè!", ro: "Ce cafea!" },
    { speaker: "voce", it: "Fine.", ro: "Sfârșit." },
  ],
  wordIds: [],
};

test("item simplu: textul și exemplul, cu vocea fluxului", () => {
  expect(feedAudioJobs([simple("espr-a", "Magari!", "Magari fosse vero.")])).toEqual([
    { voice: FEED_VOICE, text: "Magari!", file: audioFileName(FEED_VOICE, "Magari!") },
    { voice: FEED_VOICE, text: "Magari fosse vero.", file: audioFileName(FEED_VOICE, "Magari fosse vero.") },
  ]);
});

test("micro-poveste: o replică, un job, cu vocea personajului", () => {
  const jobs = feedAudioJobs([story]);
  expect(jobs.map((j) => [j.voice, j.text])).toEqual([
    ["francesco", "Al bar."],
    ["sofia", "Che caffè!"],
    ["francesco", "Fine."],
  ]);
});

test("același text la două voci diferite sau în doi itemi: fără dubluri", () => {
  const jobs = feedAudioJobs([simple("espr-a", "Magari!"), simple("espr-b", "Magari!")]);
  expect(jobs).toHaveLength(1);
});

test("withFeedAudio leagă doar fișierele care există", () => {
  const item = simple("espr-a", "Magari!", "Magari fosse vero.") as GeneratedPackItem;
  const textFile = audioFileName(FEED_VOICE, "Magari!");
  const linked = withFeedAudio(item, (f) => f === textFile);
  expect(linked).toMatchObject({ audio: { it: textFile } });
  expect((linked as { audio: { example?: string } }).audio.example).toBeUndefined();
  expect("audio" in withFeedAudio(item, () => false)).toBe(false);
});

test("withFeedAudio la micro-poveste: audio pe replicile cu fișier", () => {
  const sofia = audioFileName("sofia", "Che caffè!");
  const linked = withFeedAudio(story as GeneratedPackItem, (f) => f === sofia);
  if (linked.kind !== "micro-storia") throw new Error("așteptam o micro-poveste");
  expect(linked.lines.map((l) => l.audio)).toEqual([undefined, sofia, undefined]);
});
