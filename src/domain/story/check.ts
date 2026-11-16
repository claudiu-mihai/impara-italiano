import type { Story } from "../content/schema.ts";

/** Problemele unei povești care nu țin de forma câmpurilor (aceea e verificată de `storySchema`); mesaje pentru build. */
export function storyProblems(story: Story): string[] {
  const { id, speakers, scenes } = story;
  const problems: string[] = [];
  const ids = speakers.map((s) => s.id);

  for (const speaker of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) problems.push(`${id}: personajul „${speaker}” apare de două ori`);
  const narrators = speakers.filter((s) => s.narrator);
  if (narrators.length > 1) problems.push(`${id}: cel mult un narator (sunt ${narrators.length})`);
  if (speakers.every((s) => s.narrator)) problems.push(`${id}: trebuie să existe cel puțin un personaj care nu e narator`);
  // două personaje cu aceeași voce nu s-ar mai deosebi la ascultare
  for (const voice of new Set(speakers.map((s) => s.voice))) {
    const same = speakers.filter((s) => s.voice === voice);
    if (same.length > 1) problems.push(`${id}: personajele ${same.map((s) => `„${s.id}”`).join(" și ")} au aceeași voce (${voice})`);
  }
  scenes.forEach((scene, i) => {
    scene.lines.forEach((line, j) => {
      const where = `${id}: scena ${i + 1}, replica ${j + 1}`;
      if (!ids.includes(line.speaker)) problems.push(`${where} e a unui personaj necunoscut (${line.speaker})`);
      // povestea nu are cursant cu gen: marcajul {m|f} n-ar fi rezolvat niciodată
      if ([line.it, line.ro].some((text) => /[{}|]/.test(text))) problems.push(`${where}: nu folosi marcaj de gen`);
    });
  });
  const spoken = new Set(scenes.flatMap((scene) => scene.lines.map((line) => line.speaker)));
  for (const speaker of ids.filter((x) => !spoken.has(x))) problems.push(`${id}: personajul „${speaker}” nu are nicio replică`);
  return problems;
}
