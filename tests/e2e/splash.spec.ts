import { expect, test } from "@playwright/test";

// ecranul de întâmpinare e oprit pentru celelalte teste (playwright.config.ts); aici pornim fără acea setare
test.use({ storageState: { cookies: [], origins: [] } });

const GREETINGS = /^(Buongiorno!|Buon pomeriggio!|Buonasera!|Ciao! Non dormi\?)$/;

test("la deschidere Lupino salută după oră, apoi după ~3 secunde apare Acasă", async ({ page }) => {
  await page.goto("/");
  const splash = page.getByTestId("splash");
  await expect(splash).toBeVisible();
  await expect(splash.locator('p[lang="it"]')).toHaveText(GREETINGS);
  await expect(splash).toBeHidden({ timeout: 5000 });
  await expect(page.getByRole("heading", { name: "Impara l'italiano con Lupino" })).toBeVisible();
});

test("o atingere sare peste întâmpinare", async ({ page }) => {
  await page.goto("/");
  const splash = page.getByTestId("splash");
  await expect(splash).toBeVisible();
  await splash.click();
  await expect(splash).toBeHidden({ timeout: 1000 });
});

test("salutul ține de ora telefonului", async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 24, 8, 30) });
  await page.goto("/");
  await expect(page.getByTestId("splash").locator('p[lang="it"]')).toHaveText("Buongiorno!");
});

test("o reîncărcare pe altă pagină nu arată întâmpinarea", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Statistici" })).toBeVisible();
  await expect(page.getByTestId("splash")).toHaveCount(0);
});
