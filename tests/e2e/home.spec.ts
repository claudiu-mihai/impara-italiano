import { expect, test, type Locator, type Page } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

const CONJ_LINK = /^Conjugare:? ?\d+ repetiții · \d+ timpuri noi$/;

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

/** Un rând de text în interiorul butonului: nu se rupe pe două rânduri și nu atinge marginea. */
async function expectFitsInside(button: Locator) {
  const box = (await button.boundingBox())!;
  const parts = button.locator("span.block");
  await expect(parts).toHaveCount(2);
  for (const part of await parts.all()) {
    const fits = await part.evaluate((el) => ({
      lines: el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
      left: el.getBoundingClientRect().left,
      right: el.getBoundingClientRect().right,
    }));
    expect(fits.lines, "textul se rupe pe două rânduri").toBeLessThan(1.5);
    expect(fits.left, "textul atinge marginea din stânga").toBeGreaterThanOrEqual(box.x + 12);
    expect(fits.right, "textul atinge marginea din dreapta").toBeLessThanOrEqual(box.x + box.width - 12);
  }
}

test("Acasă pe 360 px: butonul de conjugare are titlu și rezumat pe rânduri separate, centrate și cu margine, în română", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/");
  const conj = page.getByRole("link", { name: CONJ_LINK });
  await expect(conj).toBeVisible();
  await expectFitsInside(conj);
});

test("Acasă pe 360 px: butonul de conjugare încape și în italiană", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/settings");
  await page.getByLabel("Limba interfeței / Lingua dell'interfaccia").selectOption("it");
  await page.goto("/");
  const conj = page.getByRole("link", { name: /^Coniugazione/ });
  await expect(conj).toBeVisible();
  await expectFitsInside(conj);
});

test.describe("conjugările se încarcă încet", () => {
  // fără service worker, ca cererea fișierului să treacă prin page.route
  test.use({ serviceWorkers: "block" });

  test("Acasă nu spune „Fatto!” cât timp conjugările încă se încarcă", async ({ page }) => {
    await seedLearnedWords(page, ["v-parlare"]);
    await setNewPerDay(page, 0);
    await page.route(/conjugations-.*\.js/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(600); // chunk-ul întârzie 2,5 s: suntem în starea de încărcare
    expect(await page.getByText("Fatto! Ora relax.").count(), "„Fatto!” apare înainte să se știe ce conjugări mai sunt").toBe(0);
    // după încărcare, butonul de conjugare apare ca buton principal
    const conj = page.getByRole("link", { name: CONJ_LINK });
    await expect(conj).toBeVisible({ timeout: 10_000 });
    await expect(conj).toHaveAttribute("data-variant", "primary");
    await expect(page.getByText("Fatto! Ora relax.")).toHaveCount(0);
  });
});
