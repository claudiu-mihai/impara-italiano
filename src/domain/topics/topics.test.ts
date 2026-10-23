import { State } from "ts-fsrs";
import { expect, test } from "vitest";
import { newStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { buildTopicSession, dueSkillTopics, topicProgress, topicWordIds } from "./topics.ts";

const NOW = new Date("2026-03-10T10:00:00");
const DAY = 86_400_000;

function card(kind: StoredCard["kind"], wordId: string, variant: string, over: Partial<StoredCard> = {}): StoredCard {
  const base = newStoredCard({ cardId: `${kind}:${wordId}:${variant}`, wordId, kind, variant }, NOW, "2026-03-01");
  return { ...base, ...over };
}

const topic = { subgroups: [{ title: "a", wordIds: ["w1", "w2", "w3"] }, { title: "b", wordIds: ["w3", "w4"] }] };

test("cuvintele temei, în ordinea fișei, fără duplicate", () => {
  expect(topicWordIds(topic)).toEqual(["w1", "w2", "w3", "w4"]);
});

test("progres: începute și stăpânite", () => {
  const cards = [
    card("vocab", "w1", "it-ro", { stability: 30, state: State.Review }),
    card("vocab", "w2", "it-ro", { stability: 3, state: State.Review }),
    card("vocab", "x9", "it-ro", { stability: 99, state: State.Review }),
  ];
  expect(topicProgress(topic, cards)).toEqual({ total: 4, started: 2, mastered: 1 });
});

test("Studiază tema: scadențele temei și cuvintele noi din temă, nu din restul dicționarului", () => {
  const due = card("vocab", "w2", "it-ro", { state: State.Review, due: new Date(NOW.getTime() - DAY) });
  const notDue = card("vocab", "w1", "it-ro", { state: State.Review, due: new Date(NOW.getTime() + 10 * DAY) });
  const other = card("vocab", "x9", "it-ro", { state: State.Review, due: new Date(NOW.getTime() - DAY) });
  const queue = buildTopicSession({ now: NOW, direction: "it-ro", cards: [due, notDue, other], wordIds: topicWordIds(topic) });
  expect(queue.map((i) => `${i.wordId}:${i.isNew ? "nou" : "rep"}`)).toEqual(["w2:rep", "w3:nou", "w4:nou"]);
});

test("Studiază tema: cel mult 10 cuvinte noi pe sesiune", () => {
  const ids = Array.from({ length: 25 }, (_, i) => `w${i}`);
  const queue = buildTopicSession({ now: NOW, direction: "it-ro", cards: [], wordIds: ids });
  expect(queue).toHaveLength(10);
  expect(queue.every((i) => i.isNew)).toBe(true);
});

test("abilitățile scadente apar la zi; cele neîncepute sau neajunse la scadență nu", () => {
  const topics = [{ id: "n", skill: "numbers-0-20" as const }, { id: "c", skill: "clock" as const }, { id: "x" }];
  const cards = [
    card("skill", "numbers-0-20", "auto", { state: State.Review, due: new Date(NOW.getTime() - DAY) }),
    card("skill", "clock", "auto", { state: State.Review, due: new Date(NOW.getTime() + 5 * DAY) }),
  ];
  expect(dueSkillTopics(topics, cards, NOW).map((t) => t.id)).toEqual(["n"]);
  expect(dueSkillTopics(topics, [], NOW)).toEqual([]);
});

test("Studiază tema în modul „ambele”: repetiții din ambele direcții, cuvinte noi IT → RO", () => {
  const due = { due: new Date(NOW.getTime() - DAY), state: State.Review };
  const cards = [card("vocab", "w1", "it-ro", due), card("vocab", "w2", "ro-it", due)];
  const queue = buildTopicSession({ now: NOW, direction: "both", cards, wordIds: topicWordIds(topic) });
  expect(queue.filter((i) => !i.isNew).map((i) => `${i.wordId}:${i.variant}`).sort()).toEqual(["w1:it-ro", "w2:ro-it"]);
  expect(queue.filter((i) => i.isNew).map((i) => `${i.wordId}:${i.variant}`)).toEqual(["w3:it-ro", "w4:it-ro"]);
});
