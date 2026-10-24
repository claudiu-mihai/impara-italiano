import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

interface SentenceData {
  ro: string;
  tokens: string[];
  acceptedOrders: number[][];
}

// Aceleași propoziții ca în aplicație (generate de `npm run build:data`).
const SENTENCES: SentenceData[] = JSON.parse(readFileSync("src/data/generated/sentences.json", "utf8"));

async function learnWords(page: Page, count: number) {
  await page.goto("/learn/vocab");
  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: "Arată răspunsul" }).click();
    await page.getByRole("button", { name: /^Ușor/ }).click();
    // contorul avansează (sau apare ecranul final după ultimul card) doar după salvarea notei
    await expect(page.getByText(new RegExp(`^${i + 2} / \\d+$`)).or(page.getByText("Sesiune încheiată"))).toBeVisible();
  }
}

const bankButtons = (page: Page) => page.getByRole("group", { name: "Cuvinte disponibile" }).getByRole("button");
const promptText = (page: Page) => page.getByText("Scrie în italiană:").locator("xpath=following-sibling::p");

/** Pune în răspuns, pe rând, blocurile unei ordini date. */
async function place(page: Page, words: string[]) {
  for (const word of words) await bankButtons(page).filter({ hasText: new RegExp(`^${word}$`) }).first().click();
}

test("fără cuvinte învățate nu există exerciții de reconstruire", async ({ page }) => {
  await page.goto("/learn/sentence");
  await expect(page.getByText("Încă nu ai propoziții de construit")).toBeVisible();
});

test("ordinea corectă primește „Corect!”, iar răspunsul greșit arată varianta corectă", async ({ page }) => {
  await learnWords(page, 3);
  await page.goto("/learn/sentence");
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Verifică" })).toBeDisabled();

  const ro = (await promptText(page).textContent())!;
  const sentence = SENTENCES.find((s) => s.ro === ro)!;
  expect(sentence, `propoziția „${ro}” există în date`).toBeTruthy();

  await place(page, sentence.acceptedOrders[0]!.map((i) => sentence.tokens[i]!));
  await page.getByRole("button", { name: "Verifică" }).click();
  await expect(page.getByText("Corect!")).toBeVisible();
  await expect(page.locator('img.mascot[src*="lupino-bravo"]')).toBeVisible();
  await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();

  // A doua întrebare: răspuns greșit (blocurile în ordinea amestecată, aproape sigur incorectă).
  const secondRo = await promptText(page).textContent();
  const second = SENTENCES.find((s) => s.ro === secondRo)!;
  const wrong = [...second.acceptedOrders[0]!].reverse().map((i) => second.tokens[i]!);
  const isAlsoValid = second.acceptedOrders.some((o) => o.map((i) => second.tokens[i]).join(" ") === wrong.join(" "));
  test.skip(isAlsoValid, "inversarea dă o ordine acceptată pentru această propoziție");
  await place(page, wrong);
  await page.getByRole("button", { name: "Verifică" }).click();
  await expect(page.getByText("Nu chiar. Varianta corectă:")).toBeVisible();
  await expect(page.locator('img.mascot[src*="lupino-pensa"]')).toBeVisible();
});

test("o variantă acceptată de ordine este recunoscută ca „Corect!”", async ({ page }) => {
  await learnWords(page, 10); // limita zilnică; destule cuvinte ca să existe propoziții cu variante
  const withVariants = SENTENCES.filter((s) => s.acceptedOrders.length > 1);
  expect(withVariants.length).toBeGreaterThan(5);

  await page.goto("/learn/sentence");
  for (let step = 0; step < 8; step++) {
    const ro = await promptText(page).textContent();
    const sentence = SENTENCES.find((s) => s.ro === ro);
    if (sentence && sentence.acceptedOrders.length > 1) {
      const alternative = sentence.acceptedOrders[1]!.map((i) => sentence.tokens[i]!);
      await place(page, alternative);
      await page.getByRole("button", { name: "Verifică" }).click();
      await expect(page.getByText("Corect!")).toBeVisible();
      return;
    }
    // propoziție fără variante: o rezolvăm și mergem mai departe
    await place(page, sentence!.acceptedOrders[0]!.map((i) => sentence!.tokens[i]!));
    await page.getByRole("button", { name: "Verifică" }).click();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  test.skip(true, "în această rundă nu a apărut nicio propoziție cu variante");
});

test("un cuvânt pus în răspuns poate fi scos, iar „Reia” golește răspunsul", async ({ page }) => {
  await learnWords(page, 3);
  await page.goto("/learn/sentence");
  await expect(page.getByText("Scrie în italiană:")).toBeVisible(); // ecranul s-a încărcat
  const total = await bankButtons(page).count();
  expect(total).toBeGreaterThanOrEqual(3);

  await bankButtons(page).first().click();
  await expect(bankButtons(page)).toHaveCount(total - 1);
  await page.getByRole("button", { name: /\(scoate din răspuns\)/ }).click();
  await expect(bankButtons(page)).toHaveCount(total);

  await bankButtons(page).first().click();
  await bankButtons(page).first().click();
  await page.getByRole("button", { name: "Reia" }).click();
  await expect(bankButtons(page)).toHaveCount(total);
});
