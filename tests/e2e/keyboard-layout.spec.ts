import { expect, test, type Locator, type Page } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

// Tastatura de pe telefon acoperă mai bine de jumătate din ecran: simulăm doar zona rămasă vizibilă.
const VISIBLE = { width: 412, height: 440 };

async function openKeyboard(page: Page) {
  await page.setViewportSize(VISIBLE);
}

async function inside(locator: Locator) {
  const box = (await locator.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(-0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(VISIBLE.height + 0.5);
}

/** Cerința și câmpul sunt în ecran, iar pagina însăși nu a derulat. */
async function expectPromptAndFieldVisible(page: Page, prompt: Locator, field: Locator) {
  await expect(prompt).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  await inside(prompt);
  await inside(field);
}

test("Conjugare, scris: cerința, câmpul și butonul rămân în ecran cu tastatura deschisă", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();
  await openKeyboard(page);

  const field = page.getByLabel(/^Forma pentru/);
  await field.click();
  await expectPromptAndFieldVisible(page, page.getByTestId("person"), field);
  await inside(page.getByRole("button", { name: "Verifică" }));
});

test("Conjugare, tabel: cardul rămâne sus, iar câmpul activ este în ecran", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Tabel" }).click();
  await expect(page.getByTestId("conj-table")).toBeVisible();
  await openKeyboard(page);

  const last = page.locator("#form-5");
  await last.click();
  await expectPromptAndFieldVisible(page, page.getByText("parlare", { exact: true }), last);
});

test("Gramatică, completează golul: propoziția și câmpul rămân în ecran", async ({ page }) => {
  await page.goto("/learn/grammar/essere/type");
  await expect(page.getByTestId("grammar-prompt")).toBeVisible();
  await openKeyboard(page);

  const field = page.getByRole("textbox");
  await field.click();
  await expectPromptAndFieldVisible(page, page.getByTestId("grammar-prompt"), field);
  await inside(page.getByRole("button", { name: "Verifică" }));
});

test("Unde e Lupino?, scris: scena și câmpul rămân în ecran", async ({ page }) => {
  await page.goto("/learn/topics/pozitia-obiectelor/cat");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("group", { name: "Variante de răspuns" }).getByRole("button").first().click();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  await openKeyboard(page);

  const field = page.getByLabel(/Scrie unde e Lupino/);
  await field.click();
  await expectPromptAndFieldVisible(page, page.locator("main svg, main img").first(), field);
  await inside(page.getByRole("button", { name: "Verifică" }));
});

test("Numere: cerința și câmpul rămân în ecran", async ({ page }) => {
  await page.goto("/learn/topics/numere-0-20/numbers");
  const field = page.getByLabel("Răspunsul tău");
  await expect(field).toBeVisible();
  await openKeyboard(page);

  await field.click();
  await expectPromptAndFieldVisible(page, page.locator("main section").first(), field);
  await inside(page.getByRole("button", { name: "Verifică" }));
});

test("Ceas, scris: cadranul și câmpul rămân în ecran", async ({ page }) => {
  await page.goto("/learn/topics/ora/clock");
  const field = page.getByLabel("Răspunsul tău");
  const clocks = page.getByRole("group", { name: "Ceasuri" });
  // întrebările cu variante se trec până apare una cu câmp de scris
  for (let i = 0; i < 10; i++) {
    await expect(field.or(clocks)).toBeVisible();
    if (await field.isVisible()) break;
    await clocks.getByRole("button").first().click();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  await expect(field).toBeVisible();
  await openKeyboard(page);

  await field.click();
  await expectPromptAndFieldVisible(page, page.locator("main section").first(), field);
  await inside(page.getByRole("button", { name: "Verifică" }));
});

test("zonă vizibilă foarte mică: cerința rămâne lipită sus și câmpul activ se vede", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 300 });

  const field = page.getByLabel(/^Forma pentru/);
  await field.click();
  await page.getByRole("button", { name: "Verifică" }).scrollIntoViewIfNeeded();
  const person = (await page.getByTestId("person").boundingBox())!;
  expect(person.y).toBeGreaterThanOrEqual(-0.5);
  expect(person.y + person.height).toBeLessThanOrEqual(300.5);
  await expect(page.getByRole("button", { name: "Verifică" })).toBeInViewport();
});
