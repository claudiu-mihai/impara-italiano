import type { Dialogue } from "../content/schema.ts";
import { genderMarkupProblems } from "./gender.ts";

export const MIN_LINES = 4;
export const MAX_LINES = 8;
/** Fiecare personaj trebuie să spună cel puțin atâtea replici, ca jocul de rol să fie o conversație. */
export const MIN_LINES_PER_SPEAKER = 2;

/** Problemele unui dialog care nu țin de forma câmpurilor (aceea e verificată de `dialogueSchema`); mesaje pentru build. */
export function dialogueProblems(dialogue: Dialogue, topicIds: ReadonlySet<string>): string[] {
  const { id, topicId, speakers, you, lines } = dialogue;
  const problems: string[] = [];
  const speakerIds = speakers.map((s) => s.id);

  if (!topicIds.has(topicId)) problems.push(`${id}: tema „${topicId}” nu există`);
  if (lines.length < MIN_LINES || lines.length > MAX_LINES) {
    problems.push(`${id}: ${lines.length} replici (între ${MIN_LINES} și ${MAX_LINES})`);
  }
  if (speakerIds[0] === speakerIds[1]) problems.push(`${id}: personajele au același id`);
  if (!speakerIds.includes(you)) problems.push(`${id}: „you” (${you}) nu e un personaj`);
  for (const speaker of speakers) {
    if (speaker.id === you && speaker.gender) {
      problems.push(`${id}: personajul cursantului („${speaker.id}”) nu are gen: îl alege cursantul`);
    } else if (speaker.id !== you && !speaker.gender) {
      problems.push(`${id}: personajul „${speaker.id}” trebuie să aibă gen (m sau f)`);
    }
  }
  lines.forEach((line, i) => {
    if (!speakerIds.includes(line.speaker)) problems.push(`${id}: replica ${i + 1} e a unui personaj necunoscut (${line.speaker})`);
    for (const text of [line.it, line.ro]) {
      for (const problem of genderMarkupProblems(text)) problems.push(`${id}: replica ${i + 1}: ${problem}`);
    }
  });
  const { title, canDo } = dialogue;
  if ([title.it, title.ro, canDo.it, canDo.ro].some((text) => /[{}|]/.test(text))) {
    problems.push(`${id}: titlul și reperul nu pot avea marcaj de gen`);
  }
  for (const speaker of new Set(speakerIds)) {
    const count = lines.filter((l) => l.speaker === speaker).length;
    if (count < MIN_LINES_PER_SPEAKER) problems.push(`${id}: ${speaker} are doar ${count} replici (minim ${MIN_LINES_PER_SPEAKER})`);
  }
  return problems;
}
