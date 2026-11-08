import { expect, test, type Page } from "@playwright/test";

const headings = (page: Page) => page.getByRole("heading", { level: 2 }).allTextContents();
const panel = (page: Page, title: string) =>
  page.locator("details", { has: page.getByRole("heading", { name: title, level: 2, exact: true }) });
const isOpen = (page: Page, title: string) => panel(page, title).evaluate((el) => (el as HTMLDetailsElement).open);

test("Statistici: rezumatul e sus, în ordinea seria → următoarele 7 zile → gramatică și teme → progres", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Serie de zile", level: 2 })).toBeVisible();
  const order = (await headings(page)).map((h) => h.trim());
  expect(order.slice(0, 4)).toEqual(["Serie de zile", "Următoarele 7 zile", "Gramatică și teme", "Progres"]);
  // restul în ordinea de dinainte
  expect(order.slice(4)).toEqual(["Calendar de activitate", "Niveluri", "Cuvinte după progres", "Cuvinte pe categorii", "Activitate"]);
});

test("Statistici: primele trei secțiuni sunt deschise, restul restrânse și se deschid la atingere", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Serie de zile", level: 2 })).toBeVisible();
  for (const title of ["Serie de zile", "Următoarele 7 zile", "Gramatică și teme"]) expect(await isOpen(page, title)).toBe(true);
  for (const title of ["Progres", "Calendar de activitate", "Niveluri", "Cuvinte după progres", "Cuvinte pe categorii", "Activitate"]) {
    expect(await isOpen(page, title)).toBe(false);
  }
  await expect(page.getByTestId("progress-new")).toBeHidden();
  await page.getByRole("heading", { name: "Cuvinte după progres", level: 2 }).click();
  await expect(page.getByTestId("progress-new")).toBeVisible();
  // a doua atingere o restrânge la loc
  await page.getByRole("heading", { name: "Cuvinte după progres", level: 2 }).click();
  await expect(page.getByTestId("progress-new")).toBeHidden();
});

test("Statistici: gramatică și teme, fără progres și după „Am citit”", async ({ page }) => {
  await page.goto("/stats");
  const section = panel(page, "Gramatică și teme");
  await expect(section.getByText(/^0 din 12 lecții citite$/)).toBeVisible();
  await expect(section.getByText(/Scor mediu/)).toHaveCount(0);
  await expect(section.getByRole("link", { name: /lecții citite/ })).toHaveAttribute("href", "/learn/grammar");
  await expect(section.getByRole("link", { name: /teme începute/ })).toHaveAttribute("href", "/learn/topics");

  await page.goto("/learn/grammar/articoli");
  await page.getByRole("button", { name: "Am citit" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Citită" })).toBeVisible();
  await page.goto("/stats");
  await expect(panel(page, "Gramatică și teme").getByText(/^1 din 12 lecții citite$/)).toBeVisible();
});

test("Statistici în italiană: „Grammatica e temi” cu rezumatul", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Limba interfeței / Lingua dell'interfaccia").selectOption("it");
  await page.goto("/stats");
  const section = panel(page, "Grammatica e temi");
  await expect(section.getByText(/^0 su 12 lezioni lette$/)).toBeVisible();
});
