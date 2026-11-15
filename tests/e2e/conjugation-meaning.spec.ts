import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { mockSpeech, seedConjCards, seedLearnedWords, spoken } from "./helpers.ts";

const CONJUGATIONS: Record<string, Record<string, string[][]>> = JSON.parse(
  readFileSync("src/data/generated/conjugations.json", "utf8"),
);
const PRESENTE = CONJUGATIONS["v-parlare"]!["presente"]!;
const PERSONS = ["io", "tu", "lui/lei", "noi", "voi", "loro"];
const VORBI = ["eu vorbesc", "tu vorbești", "el/ea vorbește", "noi vorbim", "voi vorbiți", "ei/ele vorbesc"];

test("Scrie: cerința e sensul în română (eu vorbesc), cu verbul și persoana italiană", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");

  const person = (await page.getByTestId("person").textContent())!.trim();
  const index = PERSONS.indexOf(person);
  await expect(page.getByTestId("ro-prompt")).toHaveText(VORBI[index]!);
  await expect(page.getByText("parlare", { exact: true })).toBeVisible();

  await page.getByRole("textbox").fill(PRESENTE[index]![0]!);
  await page.getByRole("button", { name: "Verifică" }).click();
  await expect(page.getByText("Corect!")).toBeVisible();
});

test("conjugarea primește timpuri noi doar la verbele frecvente din listă", async ({ page }) => {
  // „nuotare” e un verb A1 învățat, dar nu e în lista de conjugare activă: rămâne doar vocabular
  await seedLearnedWords(page, ["v-nuotare"]);
  await page.goto("/learn/conjugation");
  await expect(page.getByText("Nimic de conjugat acum")).toBeVisible();
});

test("cardurile vechi ale verbelor din afara listei revin, cu cerința de dinainte", async ({ page }) => {
  await seedLearnedWords(page, ["v-nuotare"]);
  await seedConjCards(page, [{ verbId: "v-nuotare", tense: "presente", stability: 3, dueInDays: -1 }]);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();
  await expect(page.getByTestId("ro-prompt")).toHaveCount(0);
  await expect(page.getByText("a înota", { exact: true })).toBeVisible();
});

test("Cu voce tare: îndemn pe față, iar la întoarcere forma se aude ca s-o compari", async ({ page }) => {
  await mockSpeech(page);
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Cu voce tare" }).click();

  await expect(page.getByTestId("say-aloud")).toHaveText(/Spune forma cu voce tare/);
  await expect(page.getByTestId("ro-prompt")).toBeVisible();
  const person = (await page.getByTestId("person").textContent())!.trim();
  const index = PERSONS.indexOf(person);

  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect(page.getByTestId("say-aloud")).toHaveCount(0);
  await expect(page.getByTestId("flip-answer")).toContainText(PRESENTE[index]!.join(" / "));
  const pronoun = person.split("/")[0]!;
  await expect.poll(() => spoken(page)).toContain(`${pronoun} ${PRESENTE[index]![0]}`);
});
