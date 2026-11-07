import type { GrammarTopic } from "../content/schema.ts";
import { markupError } from "./markup.ts";

const HAS_TAG = /\[\/?[a-z]+\]/;
const RAW = "marcajele nu se afișează aici";

/**
 * Problemele unei lecții care nu se pot exprima în schema zod; build-ul le raportează ca erori.
 * Marcajele `[it]` / `[b]` sunt permise doar în paragrafe, capcane și note; în rest textul se afișează neprelucrat.
 */
export function lessonProblems(topic: GrammarTopic): string[] {
  const problems: string[] = [];
  const raw = (where: string, texts: readonly (string | undefined)[]) => {
    if (texts.some((t) => t !== undefined && HAS_TAG.test(t))) problems.push(`${where}: ${RAW}`);
  };
  const markup = (where: string, text: string | undefined) => {
    const problem = text === undefined ? undefined : markupError(text);
    if (problem) problems.push(`${where}: ${problem}`);
  };

  topic.lesson.forEach((block, i) => {
    const where = `blocul ${i + 1}`;
    switch (block.type) {
      case "text":
      case "trap":
        markup(where, block.ro);
        break;
      case "examples": {
        const seen = new Set<string>();
        for (const example of block.items) {
          markup(where, example.note);
          raw(where, [example.it, example.ro]);
          if (seen.has(example.it)) problems.push(`${where}: exemplul „${example.it}” apare de două ori`);
          seen.add(example.it);
        }
        break;
      }
      case "table":
        raw(where, [block.caption, ...block.head, ...block.rows.flat()]);
        for (const col of block.itColumns ?? []) {
          if (col >= block.head.length) problems.push(`${where}: coloana ${col} nu există (tabelul are ${block.head.length})`);
        }
        break;
    }
  });
  topic.rules.forEach((rule, i) => raw(`regula ${i + 1}`, [rule]));
  raw("titlul", [topic.title]);
  return problems;
}
