import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

test("fișa unui verb regulat → lecția → înapoi la cuvânt", async ({ page }) => {
  await page.goto("/browse/v-parlare");
  await page.getByRole("link", { name: /Regula: Prezentul verbelor regulate/ }).click();
  await expect(page).toHaveURL(/\/learn\/grammar\/presente-regolare$/);
  await expect(page.getByRole("heading", { name: "Prezentul verbelor regulate", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Înapoi la parlare" }).click();
  await expect(page).toHaveURL(/\/browse\/v-parlare$/);
});

test("fișa unui verb neregulat la prezent nu are link către lecție (nici în -rre)", async ({ page }) => {
  for (const id of ["v-andare", "v-tradurre"]) {
    await page.goto(`/browse/${id}`);
    await expect(page.getByRole("heading", { name: "Verb" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Regula:/ })).toHaveCount(0);
  }
});

test("doar fișa unui verb regulat are link către lecție, nu și substantivele sau adjectivele", async ({ page }) => {
  await page.goto("/browse/v-parlare");
  await expect(page.getByRole("link", { name: /Regula: Prezentul verbelor regulate/ })).toBeVisible();
  // substantivele și adjectivele nu au link către lecție
  for (const id of ["n-libro", "a-rosso"]) {
    await page.goto(`/browse/${id}`);
    await expect(page.getByRole("heading", { name: id.startsWith("n-") ? "Substantiv" : "Adjectiv" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Regula:/ })).toHaveCount(0);
  }
});

test("lecția deschisă direct: Înapoi duce la lista de gramatică", async ({ page }) => {
  await page.goto("/learn/grammar/articoli");
  await page.getByRole("link", { name: "Înapoi la Gramatică" }).click();
  await expect(page).toHaveURL(/\/learn\/grammar$/);
});

test("cu interfața în italiană, linkul spune „La regola”", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Limba interfeței / Lingua dell'interfaccia").selectOption("it");
  await expect(page.getByRole("heading", { name: "Impostazioni", level: 1 })).toBeVisible();
  await page.goto("/browse/v-parlare");
  await expect(page.getByRole("link", { name: /La regola: Prezentul verbelor regulate/ })).toBeVisible();
});

test("conjugare la prezent → lecția → înapoi în sesiune", async ({ page }) => {
  await seedLearnedWords(page, ["v-parlare"]);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();
  await page.getByRole("link", { name: /Regula: Prezentul verbelor regulate/ }).click();
  await expect(page.getByRole("heading", { name: "Prezentul verbelor regulate", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Înapoi la Conjugare" }).click();
  await expect(page).toHaveURL(/\/learn\/conjugation$/);
  await expect(page.getByTestId("person")).toBeVisible();
});

test("conjugare la prezent pentru un verb neregulat → lecția despre verbe neregulate", async ({ page }) => {
  await seedLearnedWords(page, ["v-andare"]);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();
  await expect(page.getByRole("link", { name: /Regula: Verbe neregulate frecvente la prezent/ })).toBeVisible();
});

test("Înapoi din lecție se întoarce în istoric: butonul Înapoi al telefonului nu mai revine în lecție", async ({ page }) => {
  await page.goto("/");
  await page.goto("/browse/v-parlare");
  await page.getByRole("link", { name: /Regula: Prezentul verbelor regulate/ }).click();
  await page.getByRole("link", { name: "Înapoi la parlare" }).click();
  await expect(page).toHaveURL(/\/browse\/v-parlare$/);
  await page.goBack();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("după un joc pornit din lecție, Înapoi duce tot la cuvântul de plecare", async ({ page }) => {
  await page.goto("/browse/v-parlare");
  await page.getByRole("link", { name: /Regula: Prezentul verbelor regulate/ }).click();
  await page.getByRole("link", { name: /Cartonașe/ }).click();
  await expect(page.getByTestId("grammar-card")).toBeVisible();
  await page.getByRole("link", { name: "Ieși din sesiune" }).click();
  await expect(page).toHaveURL(/\/learn\/grammar\/presente-regolare$/);
  await page.getByRole("link", { name: "Înapoi la parlare" }).click();
  await expect(page).toHaveURL(/\/browse\/v-parlare$/);
});

test("lecția despre verbele neregulate → dicționarul cu verbele neregulate din grupa A", async ({ page }) => {
  const irregular = new Set<string>(JSON.parse(readFileSync("src/data/generated/presenteIrregular.json", "utf8")));
  const words: { id: string; level: string }[] = JSON.parse(readFileSync("src/data/generated/details.json", "utf8"));
  const inA = words.filter((w) => irregular.has(w.id) && w.level.startsWith("A")).length;
  const allA = words.filter((w) => w.level.startsWith("A")).length;

  await page.goto("/learn/grammar/presente-irregolare");
  await page.getByRole("link", { name: "Vezi și alte verbe neregulate" }).click();
  await expect(page).toHaveURL(/\/browse\?irregular=presente&cefr=A$/);
  await expect(page.getByRole("status")).toHaveText(`${inA} cuvinte`);
  await expect(page.getByRole("link", { name: /andare/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /parlare/ })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Nivel CEFR" }).getByRole("button", { name: /^Nivel A/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // chip-ul se închide: rămâne doar filtrul de nivel
  await page.getByRole("button", { name: "Scoate filtrul Neregulate la prezent" }).click();
  await expect(page.getByRole("status")).toHaveText(`${allA} cuvinte`);
});
