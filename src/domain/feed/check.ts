import type { Level, PackItem, Story } from "../content/schema.ts";
import { PACK_ID_PREFIX } from "../content/schema.ts";
import { isUpTo } from "../content/levels.ts";
import { normalize } from "../grading/normalize.ts";
import { storyProblems } from "../story/check.ts";

/** Nivelul unui item: cel scris, iar la prietenii falși nivelul primului cuvânt din dicționar. */
export function resolvePackLevel(item: PackItem, levelOf: (wordId: string) => Level | undefined): Level {
  if (item.kind === "falso-amico") return levelOf(item.wordIds[0] ?? "") ?? "A1";
  return item.level ?? "A1";
}

/** Problemele pachetului care nu țin de forma câmpurilor (aceea e verificată de `packItemSchema`); mesaje pentru build. */
export function packProblems(items: readonly PackItem[], levelOf: (wordId: string) => Level | undefined): string[] {
  const problems: string[] = [];
  const ids = items.map((i) => i.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) problems.push(`${id}: id-ul apare de două ori`);

  for (const item of items) {
    const { id } = item;
    const prefix = PACK_ID_PREFIX[item.kind];
    if (!id.startsWith(prefix)) problems.push(`${id}: id-ul unui item „${item.kind}” începe cu prefixul „${prefix}”`);

    if (item.kind === "falso-amico") {
      if (item.level !== undefined) problems.push(`${id}: nivelul se calculează din dicționar, nu se scrie`);
      if (item.wordIds.length === 0) problems.push(`${id}: trebuie cel puțin un cuvânt în wordIds (primul e cuvântul italian)`);
    } else if (item.level === undefined) {
      problems.push(`${id}: nivelul lipsește`);
    } else if (item.kind === "modo-di-dire") {
      // idiomurile urcă până la B2, ceilalți itemi rămân la B1
      if (!isUpTo(item.level, "B2")) problems.push(`${id}: nivel A1–B2 (nu ${item.level})`);
    } else if (!isUpTo(item.level, "B1")) {
      problems.push(`${id}: nivel A1–B1 (nu ${item.level})`);
    }

    for (const wordId of item.wordIds) if (levelOf(wordId) === undefined) problems.push(`${id}: cuvântul „${wordId}” nu există în dicționar`);

    if (item.quiz) {
      const { options, answer } = item.quiz;
      if (answer >= options.length) problems.push(`${id}: răspunsul testului (${answer}) nu e o variantă validă`);
      if (new Set(options.map(normalize)).size !== options.length) problems.push(`${id}: variante identice în test`);
    }

    if (item.kind === "modo-di-dire") {
      if (!item.quiz) problems.push(`${id}: un modo di dire are obligatoriu un test`);
      if (item.wordIds.length === 0) problems.push(`${id}: trebuie cel puțin un cuvânt în wordIds (intrarea din dicționar)`);
      if (item.match !== "different" && !item.roEquivalent) problems.push(`${id}: la „same” și „twist” echivalentul românesc e obligatoriu`);
    }

    if (item.kind === "micro-storia") {
      if (item.lines.length < 3 || item.lines.length > 6) problems.push(`${id}: micro-povestea are 3–6 replici (are ${item.lines.length})`);
      // aceleași reguli ca la povești: personaje, voci, narator, replici
      const asStory = { id, level: item.level ?? "A1", title: item.title, speakers: item.speakers, scenes: [{ lines: item.lines }] } as Story;
      problems.push(...storyProblems(asStory));
    }
  }
  return problems;
}
