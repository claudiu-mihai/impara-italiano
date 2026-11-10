import { expect, test, type Page } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

const exit = (page: Page) => page.getByRole("link", { name: "Ieși din sesiune" });

test("Flashcards pornit din Învață: ✕ te întoarce în Învață", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("link", { name: /^Flashcards/ }).click();
  await expect(page).toHaveURL(/\/learn\/vocab$/);
  await exit(page).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole("heading", { name: "Învață", level: 1 })).toBeVisible();
});

test("Flashcards pornit din Acasă: ✕ te întoarce în Acasă", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Începe sesiunea" }).click();
  await expect(page).toHaveURL(/\/learn\/vocab$/);
  await exit(page).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("Flashcards deschis direct (fără pagină anterioară în aplicație): ✕ duce la Acasă", async ({ page }) => {
  await page.goto("/learn/vocab");
  await exit(page).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("Flashcards dintr-o temă: ✕ rămâne pe pagina temei", async ({ page }) => {
  await page.goto("/learn/topics/familia");
  await page.getByRole("link", { name: "Studiază", exact: true }).click();
  await exit(page).click();
  await expect(page).toHaveURL(/\/learn\/topics\/familia$/);
});

test("✕ nu adaugă o intrare nouă în istoric: Înapoi nu te readuce în sesiune", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Învață" }).click();
  await page.getByRole("link", { name: /^Flashcards/ }).click();
  await exit(page).click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.goBack();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("Conjugare pornită din Învață: ✕ te întoarce în Învață, fără intrare nouă în istoric", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Învață" }).click();
  await page.getByRole("link", { name: /^Conjugare/ }).click();
  await expect(page).toHaveURL(/\/learn\/conjugation$/);
  await expect(page.getByTestId("person")).toBeVisible();
  await exit(page).click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.goBack();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("Conjugare deschisă direct: ✕ duce la Învață", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();
  await exit(page).click();
  await expect(page).toHaveURL(/\/learn$/);
});

test("Conjugare pornită din Acasă: ✕ te întoarce în Acasă", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/");
  await page.getByRole("link", { name: /^Conjugare:? ?\d+ repetiții/ }).click();
  await expect(page).toHaveURL(/\/learn\/conjugation$/);
  await expect(page.getByTestId("person")).toBeVisible();
  await exit(page).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});
