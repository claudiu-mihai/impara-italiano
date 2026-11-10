import { expect, test } from "@playwright/test";

test("Setări pe telefon îngust: eticheta stă deasupra listei, iar lista ocupă toată lățimea", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/settings");
  const row = page.locator("div.py-1", { hasText: "Nivelul curent" }).first();
  const select = page.getByLabel("Nivelul curent");
  await expect(select).toBeVisible();

  const label = (await row.getByText("Nivelul curent", { exact: true }).boundingBox())!;
  const control = (await select.boundingBox())!;
  const card = (await page.locator("section", { has: select }).boundingBox())!;
  // eticheta e deasupra controlului, nu lângă el
  expect(label.y + label.height).toBeLessThanOrEqual(control.y + 1);
  // controlul umple lățimea cardului (minus marginile), deci textul opțiunii nu se taie
  expect(control.width).toBeGreaterThan(card.width - 60);
});

test("Setări pe ecran larg: eticheta rămâne lângă control", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/settings");
  const row = page.locator("div.py-1", { hasText: "Nivelul curent" }).first();
  const label = (await row.getByText("Nivelul curent", { exact: true }).boundingBox())!;
  const control = (await page.getByLabel("Nivelul curent").boundingBox())!;
  expect(Math.abs(label.y - control.y)).toBeLessThan(40);
  expect(control.x).toBeGreaterThan(label.x + label.width);
});

test("Setări: parametrii avansați stau într-o secțiune „Avansat”, restrânsă implicit", async ({ page }) => {
  await page.goto("/settings");
  const advanced = ["Substantive printre cuvintele noi", "Timpuri noi la conjugare pe zi", "Limită de repetiții pe zi", "Retenție țintă"];
  for (const name of advanced) await expect(page.getByLabel(name)).toBeHidden();
  // cele de bază rămân la vedere
  for (const name of ["Nivelul curent", "Cuvinte noi pe zi", "Direcția cardurilor"]) await expect(page.getByLabel(name)).toBeVisible();

  await page.getByText("Avansat", { exact: true }).click();
  for (const name of advanced) await expect(page.getByLabel(name)).toBeVisible();

  await page.getByLabel("Retenție țintă").selectOption("95");
  await page.reload();
  await page.getByText("Avansat", { exact: true }).click();
  await expect(page.getByLabel("Retenție țintă")).toHaveValue("95");
});

test("Setări: direcția începe pe „Ambele”, iar cartonașele inverse apar în „Avansat” doar cu ea", async ({ page }) => {
  await page.goto("/settings");
  await page.getByText("Avansat", { exact: true }).click();
  await expect(page.getByLabel("Direcția cardurilor")).toHaveValue("both");
  await expect(page.getByLabel("Carduri inverse noi pe zi")).toBeVisible();
  await page.getByLabel("Direcția cardurilor").selectOption("it-ro");
  await expect(page.getByLabel("Carduri inverse noi pe zi")).toHaveCount(0);
});

test("Setări: audio automat și toleranța la scriere sunt pornite implicit și se pot opri", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Audio automat")).toBeChecked();
  await expect(page.getByLabel("Iartă greșelile mici de scriere")).toBeChecked();
  // fiecare schimbare se salvează înainte de următoarea (setările se scriu întregi)
  await page.getByLabel("Audio automat").click();
  await expect(page.getByLabel("Audio automat")).not.toBeChecked();
  await page.getByLabel("Iartă greșelile mici de scriere").click();
  await expect(page.getByLabel("Iartă greșelile mici de scriere")).not.toBeChecked();
  await page.reload();
  await expect(page.getByLabel("Audio automat")).not.toBeChecked();
  await expect(page.getByLabel("Iartă greșelile mici de scriere")).not.toBeChecked();
});

test("Setări în italiană: „Avanzate” și etichetele deasupra, fără text tăiat pe 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/settings");
  await page.getByLabel("Limba interfeței / Lingua dell'interfaccia").selectOption("it");
  await expect(page.getByText("Avanzate", { exact: true })).toBeVisible();
  const select = page.getByLabel("Livello attuale");
  const box = (await select.boundingBox())!;
  expect(box.width).toBeGreaterThan(250);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
});
