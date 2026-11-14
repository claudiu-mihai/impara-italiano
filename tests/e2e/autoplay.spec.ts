import { expect, test } from "@playwright/test";
import { mockSpeech, spoken } from "./helpers.ts";

test("Flashcards IT → RO: cuvântul italian se aude singur când apare cardul, o singură dată", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/settings");
  await page.getByLabel("Direcția cardurilor").selectOption("it-ro");
  await page.goto("/learn/vocab");
  await expect(page.getByTestId("card-front")).toBeVisible();
  await expect.poll(() => spoken(page)).toEqual(["essere"]);

  // la întoarcere nu se repetă (răspunsul e în română)
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect(page.getByTestId("card-back")).toBeVisible();
  expect(await spoken(page)).toEqual(["essere"]);
});

test("Flashcards RO → IT: cuvântul italian se aude când întorci cardul", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/settings");
  await page.getByLabel("Direcția cardurilor").selectOption("ro-it");
  await page.goto("/learn/vocab");
  await expect(page.getByTestId("card-front")).toBeVisible();
  expect(await spoken(page)).toEqual([]);

  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect.poll(() => spoken(page)).toEqual(["essere"]);
});

test("cu „Audio automat” oprit nu se aude nimic până la apăsarea pe 🔊", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/settings");
  await page.getByLabel("Direcția cardurilor").selectOption("it-ro");
  // fiecare schimbare se salvează înainte de următoarea (setările se scriu întregi)
  await expect(page.getByLabel("Direcția cardurilor")).toHaveValue("it-ro");
  await page.getByLabel("Audio automat").click();
  await expect(page.getByLabel("Audio automat")).not.toBeChecked();
  await page.goto("/learn/vocab");
  await expect(page.getByTestId("card-front")).toBeVisible();
  await page.waitForTimeout(300);
  expect(await spoken(page)).toEqual([]);

  await page.getByRole("button", { name: "Ascultă pronunția: essere" }).click();
  expect(await spoken(page)).toEqual(["essere"]);
});
