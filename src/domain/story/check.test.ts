import { expect, test } from "vitest";
import type { Story } from "../content/schema.ts";
import { storyProblems } from "./check.ts";

function story(overrides: Partial<Story> = {}): Story {
  return {
    id: "una-pausa-al-bar-01",
    level: "A2",
    title: { it: "Una pausa al bar", ro: "O pauză la bar" },
    speakers: [
      { id: "narratore", name: { it: "Narratore", ro: "Naratorul" }, voice: "francesco", narrator: true },
      { id: "marta", name: { it: "Marta", ro: "Marta" }, voice: "sofia" },
      { id: "elena", name: { it: "Elena", ro: "Elena" }, voice: "giullia" },
    ],
    scenes: [
      {
        lines: [
          { speaker: "narratore", it: "Al bar.", ro: "La bar." },
          { speaker: "marta", it: "Che caffè!", ro: "Ce cafea!" },
          { speaker: "elena", it: "Sì.", ro: "Da." },
        ],
      },
    ],
    ...overrides,
  };
}

test("o poveste validă nu are probleme", () => {
  expect(storyProblems(story())).toEqual([]);
});

test("personaj necunoscut într-o replică", () => {
  const s = story({ scenes: [{ lines: [{ speaker: "paolo", it: "Pronto?", ro: "Alo?" }] }] });
  expect(storyProblems(s).join("\n")).toContain("scena 1, replica 1 e a unui personaj necunoscut (paolo)");
});

test("două personaje cu aceeași voce sau cu același id", () => {
  const speakers = story().speakers;
  const sameVoice = story({ speakers: [speakers[0]!, speakers[1]!, { ...speakers[2]!, voice: "sofia" }] });
  expect(storyProblems(sameVoice).join("\n")).toContain("au aceeași voce (sofia)");
  const sameId = story({ speakers: [speakers[0]!, speakers[1]!, { ...speakers[2]!, id: "marta", voice: "luca" }] });
  expect(storyProblems(sameId).join("\n")).toContain("„marta” apare de două ori");
});

test("cel mult un narator și cel puțin un personaj care nu e narator", () => {
  const speakers = story().speakers;
  const two = story({ speakers: [speakers[0]!, { ...speakers[1]!, narrator: true }, speakers[2]!] });
  expect(storyProblems(two).join("\n")).toContain("cel mult un narator");
  const only = story({ speakers: [speakers[0]!, { ...speakers[1]!, narrator: true }] });
  expect(storyProblems(only).join("\n")).toContain("cel puțin un personaj care nu e narator");
});

test("marcajul de gen nu e permis, iar fiecare personaj trebuie să vorbească", () => {
  const marked = story({ scenes: [{ lines: [{ speaker: "marta", it: "Sono stanc{o|a}.", ro: "Sunt obosit." }, { speaker: "elena", it: "Sì.", ro: "Da." }, { speaker: "narratore", it: "Fine.", ro: "Sfârșit." }] }] });
  expect(storyProblems(marked).join("\n")).toContain("nu folosi marcaj de gen");
  const silent = story({ scenes: [{ lines: [{ speaker: "marta", it: "Sì.", ro: "Da." }] }] });
  expect(storyProblems(silent).join("\n")).toContain("„elena” nu are nicio replică");
});
