import { expect, test } from "vitest";
import { irregularPresenteIds } from "./presenteIrregular.ts";

const verbs = [
  { id: "v-andare", it: "andare", group: "are" as const },
  { id: "v-avviare", it: "avviare", group: "are" as const },
  { id: "v-conoscere", it: "conoscere", group: "ere" as const },
  { id: "v-compiere", it: "compiere", group: "ere" as const },
];
const presente = {
  "v-andare": ["vado", "vai", "va", "andiamo", "andate", "vanno"],
  "v-avviare": ["avvio", "avvii", "avvia", "avviamo", "avviate", "avviano"],
  "v-conoscere": ["conosco", "conosci", "conosce", "conosciamo", "conoscete", "conoscono"],
  "v-compiere": ["compio", "compi", "compie", "compiamo", "compiete", "compiono"],
};

test("doar verbele care diferă cu adevărat de regulă (nu prin „i” dublu sau deloc)", () => {
  expect(irregularPresenteIds(presente, verbs)).toEqual(["v-andare"]);
});
