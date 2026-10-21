import { expect, test } from "@playwright/test";
import { WORDS } from "./helpers.ts";

const TOTAL = `${WORDS.length} cuvinte`;
const inLevel = (level: string) => WORDS.filter((w) => w.level === level).length;

test("dicționarul listează toate cuvintele și caută în italiană și română, fără a conta diacriticele", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.getByRole("heading", { name: "Dicționar" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(TOTAL);

  const search = page.getByLabel("Caută în dicționar");
  await search.fill("vorbi");
  await expect(page.getByRole("status")).toHaveText("1 cuvânt");
  await expect(page.getByRole("link", { name: /parlare/ })).toBeVisible();

  await search.fill("sti"); // „ști” fără diacritice
  await expect(page.getByRole("link", { name: /sapere/ })).toBeVisible();

  await search.fill("ÎNȚELEGE");
  await expect(page.getByRole("link", { name: /capire/ })).toBeVisible();

  await search.fill("zzzz");
  await expect(page.getByText("Niciun cuvânt găsit.")).toBeVisible();
});

test("filtre după categorie și după nivel", async ({ page }) => {
  await page.goto("/browse");
  const categories = [...new Set(WORDS.map((w) => w.pos))];
  // categoriile oferite sunt doar cele din dicționar
  await expect(page.getByLabel("Categorie").locator("option")).toHaveCount(categories.length + 1);

  const verbs = WORDS.filter((w) => w.pos === "verb").length;
  await page.getByLabel("Categorie").selectOption("verb");
  await expect(page.getByRole("status")).toHaveText(`${verbs} cuvinte`);

  await page.getByLabel("Categorie").selectOption("all");
  await page.getByLabel("Progres", { exact: true }).selectOption("mastered");
  await expect(page.getByText("Niciun cuvânt găsit.")).toBeVisible();
  await page.getByLabel("Progres", { exact: true }).selectOption("new");
  await expect(page.getByRole("status")).toHaveText(TOTAL);
});

test("pagina unui cuvânt: informații despre verb, exemple și tabele de conjugare", async ({ page }) => {
  await page.goto("/browse/v-andare");
  await expect(page.getByRole("heading", { name: "andare" })).toBeVisible();
  await expect(page.getByText("a merge", { exact: true })).toBeVisible();
  await expect(page.getByText("Auxiliar: essere")).toBeVisible();
  await expect(page.getByText("Domani vado al mare.").or(page.getByText("Andiamo al mare domani."))).toBeVisible();

  // presente este deschis, celelalte timpuri sunt restrânse
  const presente = page.locator("details", { hasText: "Prezent (presente)" });
  await expect(presente).toHaveAttribute("open", "");
  await expect(presente.getByRole("cell", { name: "vado", exact: true })).toBeVisible();

  const futuro = page.locator("details", { hasText: "Viitor (futuro semplice)" });
  await futuro.getByText("Viitor (futuro semplice)").click();
  await expect(futuro.getByRole("cell", { name: "andrò", exact: true })).toBeVisible();

  const congiuntivo = page.locator("details", { hasText: "Conjunctiv (congiuntivo presente)" });
  await congiuntivo.getByText("Conjunctiv (congiuntivo presente)").click();
  await expect(congiuntivo.getByRole("cell", { name: "vadano", exact: true })).toBeVisible();
});

test("„Știu deja” pune cuvântul în repetiții și deblochează conjugarea; progresul se poate șterge", async ({ page }) => {
  await page.goto("/browse/v-parlare");
  await expect(page.getByText("Nou", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Știu deja acest cuvânt" }).click();

  await expect(page.getByText("În învățare", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Șterge progresul acestui cuvânt" })).toBeVisible();

  // nu a consumat din cele 10 cuvinte noi ale zilei
  await page.goto("/");
  await expect(page.getByText(/10 cuvinte noi/)).toBeVisible();

  // cuvântul știut este în starea „repetare”, deci conjugarea lui este deblocată
  await page.goto("/learn/conjugation");
  await expect(page.getByText("Timp nou")).toBeVisible();
  await expect(page.getByText("parlare", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.goto("/browse/v-parlare");
  await page.getByRole("button", { name: "Șterge progresul acestui cuvânt" }).click();
  await expect(page.getByText("Nou", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Știu deja acest cuvânt" })).toBeVisible();
});

test("un cuvânt inexistent afișează un mesaj și o cale de întoarcere", async ({ page }) => {
  await page.goto("/browse/v-inexistent");
  await expect(page.getByText("Cuvântul nu există în dicționar.")).toBeVisible();
  await page.getByRole("link", { name: "Înapoi la dicționar" }).click();
  await expect(page.getByRole("heading", { name: "Dicționar" })).toBeVisible();
});

test("tema: alegerea manuală se aplică imediat și rămâne după reîncărcare", async ({ page }) => {
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));

  await page.goto("/settings");
  expect(await isDark()).toBe(false); // sistemul este luminos

  await page.getByLabel("Tema").selectOption("dark");
  await expect.poll(isDark).toBe(true);

  await page.reload();
  expect(await isDark()).toBe(true); // aplicată de scriptul din index.html, înainte de afișare

  await page.getByLabel("Tema").selectOption("light");
  await expect.poll(isDark).toBe(false);
});

test("tema „automată” urmează setarea sistemului", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
});

test("filtru după nivelul CEFR și insigne de nivel pe fiecare cuvânt", async ({ page }) => {
  await page.goto("/browse");
  await page.getByLabel("Nivel CEFR").selectOption("A2");
  await expect(page.getByRole("status")).toHaveText(`${inLevel("A2")} cuvinte`);
  await expect(page.getByRole("link", { name: /scegliere/ })).toBeVisible(); // A2
  await expect(page.getByRole("link", { name: /essere/ })).toHaveCount(0); // A1

  await page.getByLabel("Nivel CEFR").selectOption("C2");
  await expect(page.getByText("Niciun cuvânt găsit.")).toBeVisible();

  await page.getByLabel("Nivel CEFR").selectOption("all");
  await expect(page.getByRole("link", { name: /essere/ }).getByTitle(/^A1 · Începător/)).toBeVisible();
});
