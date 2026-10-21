import type { Skill } from "../content/constants.ts";
import { gradeConjugation } from "../grading/gradeConjugation.ts";
import { shuffle, type Random } from "../random.ts";
import { digitForms, numberForms } from "./numbers.ts";
import { timeForms, timePhrase, type ClockTime } from "./time.ts";

/** Câți itemi se cer la o repetiție a unei abilități. */
export const SKILL_ITEMS_PER_ROUND = 5;

/** Nota unei repetiții: toți corecți → Bine, unul greșit → Greu, mai mulți → Din nou (ca la conjugare). */
export const gradeSkill = gradeConjugation;

export type SkillItem =
  /** Se aude numărul în italiană; se scrie cu cifre. */
  | { type: "listen-number"; n: number; spoken: string; answers: string[] }
  /** Se vede numărul cu cifre; se scrie cu litere. */
  | { type: "write-number"; n: number; answers: string[] }
  /** Se vede ceasul; se scrie ora în italiană. */
  | { type: "clock-write"; time: ClockTime; answers: string[] }
  /** Se citește ora în italiană; se alege ceasul corect. */
  | { type: "clock-pick"; time: ClockTime; phrase: string; options: ClockTime[]; correctIndex: number };

const NUMBER_RANGE: Record<Exclude<Skill, "clock" | "numbers-big">, [number, number]> = {
  "numbers-0-20": [0, 20],
  "numbers-21-100": [21, 100],
};

/** 100–1.000.000: mai multe trepte (sute, mii, zeci de mii), cu numere rotunjite și nerotunjite. */
function bigNumber(random: Random): number {
  const tiers: [number, number, number][] = [
    [101, 999, 1],
    [1000, 9999, 10],
    [10_000, 99_999, 100],
    [100_000, 999_999, 1000],
    [1_000_000, 1_000_000, 1],
  ];
  const [min, max, step] = tiers[Math.min(tiers.length - 1, Math.floor(random() * (tiers.length + 1)))]!;
  const n = between(min, max, random);
  return random() < 0.5 ? Math.max(min, Math.round(n / step) * step) : n;
}

const between = (min: number, max: number, random: Random) => min + Math.floor(random() * (max - min + 1));

export function randomTime(random: Random = Math.random): ClockTime {
  return { hour: between(1, 12, random), minute: between(0, 11, random) * 5 };
}

const sameTime = (a: ClockTime, b: ClockTime) => a.hour === b.hour && a.minute === b.minute;

/** Trei ore diferite de cea corectă, ca variante pentru „alege ceasul”. */
function otherTimes(time: ClockTime, random: Random): ClockTime[] {
  const others: ClockTime[] = [];
  while (others.length < 3) {
    const candidate = randomTime(random);
    if (!sameTime(candidate, time) && !others.some((o) => sameTime(o, candidate))) others.push(candidate);
  }
  return others;
}

/** Itemii unei repetiții, generați din reguli. */
export function buildSkillRound(skill: Skill, random: Random = Math.random, size = SKILL_ITEMS_PER_ROUND): SkillItem[] {
  if (skill === "clock") {
    const items: SkillItem[] = [];
    const used: ClockTime[] = [];
    while (items.length < size) {
      const time = randomTime(random);
      if (used.some((u) => sameTime(u, time))) continue;
      used.push(time);
      if (items.length < Math.ceil(size / 2)) {
        items.push({ type: "clock-write", time, answers: timeForms(time) });
      } else {
        const options = shuffle([time, ...otherTimes(time, random)], random);
        items.push({
          type: "clock-pick",
          time,
          phrase: timePhrase(time),
          options,
          correctIndex: options.findIndex((o) => sameTime(o, time)),
        });
      }
    }
    return shuffle(items, random);
  }

  const numbers = new Set<number>();
  if (skill === "numbers-big") {
    while (numbers.size < size) numbers.add(bigNumber(random));
  } else {
    const [min, max] = NUMBER_RANGE[skill];
    while (numbers.size < Math.min(size, max - min + 1)) numbers.add(between(min, max, random));
  }
  const items = [...numbers].map((n, i): SkillItem =>
    i % 2 === 0
      ? { type: "listen-number", n, spoken: numberForms(n)[0]!, answers: digitForms(n) }
      : { type: "write-number", n, answers: numberForms(n) },
  );
  return shuffle(items, random);
}
