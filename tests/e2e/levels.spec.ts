import { expect, test } from "@playwright/test";
import { seedConjCards, seedLearnedWords, WORDS } from "./helpers.ts";

const idsOf = (level: string) => WORDS.filter((w) => w.level === level).map((w) => w.id);
const A1 = idsOf("A1");
const A2 = idsOf("A2");
const C2 = idsOf("C2");

test("nivelul curent se alege în Setări, se păstrează și apare pe Acasă", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Nivel curent: Începător")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByLabel("Nivelul curent")).toHaveValue("A1");
  await page.getByLabel("Nivelul curent").selectOption("A2");

  await page.goto("/");
  await expect(page.getByText("Nivel curent: Elementar")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Nivel curent: Elementar")).toBeVisible();
});

test("în Setări, fiecare nivel arată numărul de cuvinte", async ({ page }) => {
  await page.goto("/settings");
  const options = page.getByLabel("Nivelul curent").locator("option");
  await expect(options).toHaveCount(6);
  await expect(options.nth(0)).toContainText(`A1 · Începător (${A1.length} cuvinte)`);
  await expect(options.nth(5)).toContainText(`C2 · Competență deplină (${C2.length} cuvinte)`);
});

test("la A1 nu se introduc cuvinte de A2; după ce ai început tot A1, aplicația sugerează A2", async ({ page }) => {
  await seedLearnedWords(page, A1); // toate cuvintele de A1 au deja carduri
  await page.goto("/");

  // nimic nou la A1, deși există 80 de cuvinte de A2
  await expect(page.getByText(/0 cuvinte noi/)).toBeVisible();
  await expect(page.getByText(new RegExp(`Ai început toate cele ${A1.length} cuvinte din A1`))).toBeVisible();

  await page.getByRole("button", { name: "Treci la A2" }).click();
  await expect(page.getByText("Nivel curent: Elementar")).toBeVisible();
  await expect(page.getByText(/10 cuvinte noi/)).toBeVisible(); // acum apar cuvintele de A2
  await expect(page.getByRole("button", { name: "Treci la A2" })).toHaveCount(0);
});

test("la A2 sesiunea de cuvinte noi conține doar cuvinte din A2", async ({ page }) => {
  await seedLearnedWords(page, A1);
  await page.goto("/settings");
  await page.getByLabel("Nivelul curent").selectOption("A2");

  await page.goto("/learn/vocab");
  const first = await page.getByTestId("card-front").locator("span.text-4xl").textContent();
  // substantivele se afișează cu articol („la guerra”), deci căutăm cuvântul după terminație
  const matches = WORDS.filter((w) => first === w.it || first?.endsWith(` ${w.it}`) || first?.endsWith(`'${w.it}`));
  expect(matches.length, `„${first}” există în dicționar`).toBeGreaterThan(0);
  expect(matches.every((w) => w.level === "A2")).toBe(true);
});

test("imperativul (A1) urmează după passato prossimo și are 5 persoane", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await seedConjCards(page, [
    { verbId: "v-parlare", tense: "presente", stability: 30 },
    { verbId: "v-parlare", tense: "passatoProssimo", stability: 30 },
  ]);

  await page.goto("/learn/conjugation");
  await expect(page.getByText("Timp nou")).toBeVisible();
  await expect(page.getByText("Imperativ afirmativ (imperativo)")).toBeVisible();
  // imperativul nu are „io”: persoanele cerute sunt tu, Lei, noi, voi sau Loro
  await expect(page.getByTestId("person")).toHaveText(/^(tu|Lei|noi|voi|Loro)$/);
});

test("timpurile verbale se deblochează după nivel: imperfetto apare abia la A2", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await seedConjCards(page, [
    { verbId: "v-parlare", tense: "presente", stability: 30 },
    { verbId: "v-parlare", tense: "passatoProssimo", stability: 30 },
    { verbId: "v-parlare", tense: "imperativo", stability: 30 },
  ]);

  // la A1: presente, passato prossimo și imperativo sunt învățate, imperfetto (A2) rămâne blocat
  await page.goto("/learn/conjugation");
  await expect(page.getByText("Nimic de conjugat acum")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Nivelul curent").selectOption("A2");
  await page.goto("/learn/conjugation");
  await expect(page.getByText("Timp nou")).toBeVisible();
  await expect(page.getByText("Imperfect (imperfetto)")).toBeVisible();
});

test("statisticile arată progresul pe niveluri CEFR", async ({ page }) => {
  await seedLearnedWords(page, A1.slice(0, 5));
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Niveluri" })).toBeVisible();
  await expect(page.getByText(`5 începute · 0 stăpânite din ${A1.length}`)).toBeVisible();
  await expect(page.getByText(`0 începute · 0 stăpânite din ${A2.length}`)).toBeVisible();
  await expect(page.getByText("în pregătire")).toHaveCount(0); // toate nivelurile au cuvinte
});
