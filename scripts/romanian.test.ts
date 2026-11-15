import { expect, test } from "vitest";
import { romanianPrompt } from "../src/domain/conjugation/romanian.ts";
import { isUpTo } from "../src/domain/content/levels.ts";
import { loadContent } from "./content.ts";

// Lista verbelor cu conjugare activă, din content/verbs/romanian.json (aceleași date ca `npm run build:data`)
const { romanian, words, errors } = loadContent();
const levelOf = new Map(words.map((w) => [w.id, w.level]));
const ids = Object.keys(romanian);

test("lista de conjugare e validă", () => {
  expect(errors.filter((e) => e.startsWith("romanian.json"))).toEqual([]);
});

test("conjugarea e activă doar pentru verbele frecvente de la A1 și A2", () => {
  expect(ids.length).toBeGreaterThanOrEqual(70);
  expect(ids.length).toBeLessThanOrEqual(100);
  expect(ids.every((id) => isUpTo(levelOf.get(id)!, "A2"))).toBe(true);
  expect(ids.filter((id) => levelOf.get(id) === "A1").length).toBeGreaterThanOrEqual(40);
  // verbele de bază ale vorbirii sunt în listă
  for (const id of ["v-essere", "v-avere", "v-fare", "v-andare", "v-parlare", "v-volere", "v-potere", "v-dovere"]) {
    expect(romanian[id], id).toBeDefined();
  }
});

test("cerințele arată ca în vorbire", () => {
  expect(romanianPrompt(romanian["v-andare"]!, "passatoProssimo", 3)).toBe("noi am mers");
  expect(romanianPrompt(romanian["v-essere"]!, "congiuntivo", 0)).toBe("eu să fiu");
  expect(romanianPrompt(romanian["v-dovere"]!, "presente", 0)).toBe("eu trebuie să");
  expect(romanianPrompt(romanian["v-svegliarsi"]!, "passatoProssimo", 0)).toBe("eu m-am trezit");
  expect(romanianPrompt(romanian["v-fare"]!, "imperativo", 0)).toBe("tu fă!");
});
