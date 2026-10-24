import { expect, test, type Page } from "@playwright/test";

const front = (page: Page) => page.getByTestId("card-front");
const back = (page: Page) => page.getByTestId("card-back");

async function startSession(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Începe sesiunea" }).click();
  await expect(page.getByText("1 / 10")).toBeVisible();
}

test("pagina de start arată cuvintele noi ale zilei", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Impara l'italiano con Lupino" })).toBeVisible();
  await expect(page.getByText(/10 cuvinte noi/)).toBeVisible();
});

test("o sesiune: răstoarnă cardul, notează și treci la următorul", async ({ page }) => {
  await startSession(page);

  // Primul cuvânt este „essere” (rangul 1), în direcția IT → RO.
  await expect(page.getByText("Cuvânt nou")).toBeVisible();
  await expect(front(page).getByText("essere", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect(back(page).getByText("a fi", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Cât de bine ai știut cuvântul?" }).getByRole("button")).toHaveCount(4);

  await page.getByRole("button", { name: /^Bine/ }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(front(page).getByText("avere", { exact: true })).toBeVisible();
});

test("swipe dreapta pe un card răsturnat îl notează cu Bine", async ({ page }) => {
  await startSession(page);
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect(back(page).getByText("a fi", { exact: true })).toBeVisible();

  const box = (await back(page).getByText("a fi", { exact: true }).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, y, { steps: 8 });
  await page.mouse.move(box.x + box.width / 2 + 260, y, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
});

test("progresul persistă după reîncărcarea paginii", async ({ page }) => {
  await startSession(page);
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await page.getByRole("button", { name: /^Bine/ }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();

  await page.reload();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Impara l'italiano con Lupino" })).toBeVisible();
  // „essere” a fost învățat: nu mai e nou, iar cardul revine ca repetiție în curând.
  await expect(page.getByText(/1 repetiție/)).toBeVisible();
  await expect(page.getByText(/9 cuvinte noi/)).toBeVisible();
});

test("aplicația pornește și funcționează fără internet", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Impara l'italiano con Lupino" })).toBeVisible();

  // Așteaptă ca service worker-ul să preia controlul paginii.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Impara l'italiano con Lupino" })).toBeVisible();

  await page.getByRole("link", { name: "Începe sesiunea" }).click();
  await expect(front(page).getByText("essere", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await page.getByRole("button", { name: /^Bine/ }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
});

test("manifestul PWA este valid și instalabil", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href!)).json();
  expect(manifest.name).toBe("Lupino");
  expect(manifest.short_name).toBe("Lupino");
  expect(manifest.display).toBe("standalone");
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
});
