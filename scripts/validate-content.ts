import { loadContent } from "./content.ts";

const { words, errors } = loadContent();

if (errors.length > 0) {
  console.error(`Conținut invalid: ${errors.length} erori`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log(`Conținut valid: ${words.length} cuvinte.`);
