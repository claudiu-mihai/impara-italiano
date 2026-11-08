import { expect, test, type Page } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

const CONJ_LINK = /^Conjugare: \d+ repetiții · \d+ timpuri noi$/;

async function setNewPerDay(page: Page, n: number) {
  await page.goto("/settings");
  await page.getByLabel("Cuvinte noi pe zi").selectOption(String(n));
  await expect(page.getByLabel("Cuvinte noi pe zi")).toHaveValue(String(n));
}

test("Acasă: conjugările de azi apar sub butonul sesiunii, cu un verb învățat", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/");
  const conj = page.getByRole("link", { name: CONJ_LINK });
  await expect(conj).toBeVisible();
  await expect(conj).toHaveAttribute("href", "/learn/conjugation");
  // cuvintele rămân butonul principal
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toHaveAttribute("data-variant", "primary");
  await expect(conj).toHaveAttribute("data-variant", "secondary");
});

test("Acasă: fără cuvinte noi, dar cu conjugări, conjugarea devine butonul principal și nu apare „Fatto!”", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await setNewPerDay(page, 0);
  await page.goto("/");
  const conj = page.getByRole("link", { name: CONJ_LINK });
  await expect(conj).toBeVisible();
  await expect(conj).toHaveAttribute("data-variant", "primary");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toHaveCount(0);
  await expect(page.getByText("Fatto! Ora relax.")).toHaveCount(0);
});

test("Acasă: utilizator nou, fără verbe învățate, nu are buton de conjugare", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: /^Conjugare:/ })).toHaveCount(0);
});

test("după Flashcards, cu conjugări de făcut, butonul principal duce la conjugare", async ({ page }) => {
  // o singură repetiție scadentă (ieri) și niciun cuvânt nou: sesiunea are un singur card
  await seedLearnedWords(page, ["v-parlare"], -1);
  await setNewPerDay(page, 0);
  await page.goto("/learn/vocab");
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await page.getByRole("button", { name: /^Bine/ }).click();
  await expect(page.getByRole("heading", { name: "Sesiune încheiată" })).toBeVisible();
  const next = page.getByRole("link", { name: "Continuă cu conjugarea" });
  await expect(next).toHaveAttribute("href", "/learn/conjugation");
  await expect(page.getByRole("link", { name: "Înapoi acasă" })).toBeVisible();
});

test("după Flashcards, fără conjugări de făcut, rămâne doar „Înapoi acasă”", async ({ page }) => {
  await seedLearnedWords(page, ["n-casa"], -1);
  await setNewPerDay(page, 0);
  await page.goto("/learn/vocab");
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await page.getByRole("button", { name: /^Bine/ }).click();
  await expect(page.getByRole("heading", { name: "Sesiune încheiată" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Înapoi acasă" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuă cu conjugarea" })).toHaveCount(0);
});
