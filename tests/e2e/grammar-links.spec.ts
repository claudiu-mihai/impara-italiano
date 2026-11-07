import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

test("fișa unui verb neregulat → lecția → înapoi la cuvânt", async ({ page }) => {
  await page.goto("/browse/v-andare");
  await page.getByRole("link", { name: /Regula: Verbe neregulate frecvente la prezent/ }).click();
  await expect(page).toHaveURL(/\/learn\/grammar\/presente-irregolare$/);
  await expect(page.getByRole("heading", { name: "Verbe neregulate frecvente la prezent", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Înapoi la andare" }).click();
  await expect(page).toHaveURL(/\/browse\/v-andare$/);
});

test("fișa unui verb regulat, a unui substantiv și a unui adjectiv au lecția potrivită", async ({ page }) => {
  await page.goto("/browse/v-parlare");
  await expect(page.getByRole("link", { name: /Regula: Prezentul verbelor regulate/ })).toBeVisible();
  await page.goto("/browse/n-libro");
  await expect(page.getByRole("link", { name: /Regula: Genul și pluralul substantivelor/ })).toBeVisible();
  await page.goto("/browse/a-rosso");
  await expect(page.getByRole("link", { name: /Regula: Acordul adjectivului/ })).toBeVisible();
  // verbele în -rre sunt neregulate la prezent (traduco), deși nu apar în irregular.json
  await page.goto("/browse/v-tradurre");
  await expect(page.getByRole("link", { name: /Regula: Verbe neregulate frecvente la prezent/ })).toBeVisible();
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
  await page.goto("/browse/n-libro");
  await expect(page.getByRole("link", { name: /La regola: Genul și pluralul substantivelor/ })).toBeVisible();
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
  await page.goto("/browse/v-andare");
  await page.getByRole("link", { name: /Regula: Verbe neregulate/ }).click();
  await page.getByRole("link", { name: "Înapoi la andare" }).click();
  await expect(page).toHaveURL(/\/browse\/v-andare$/);
  await page.goBack();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("după un joc pornit din lecție, Înapoi duce tot la cuvântul de plecare", async ({ page }) => {
  await page.goto("/browse/n-libro");
  await page.getByRole("link", { name: /Regula: Genul și pluralul/ }).click();
  await page.getByRole("link", { name: /Cartonașe/ }).click();
  await expect(page.getByTestId("grammar-card")).toBeVisible();
  await page.getByRole("link", { name: "Ieși din sesiune" }).click();
  await expect(page).toHaveURL(/\/learn\/grammar\/genere-plurale$/);
  await page.getByRole("link", { name: "Înapoi la libro" }).click();
  await expect(page).toHaveURL(/\/browse\/n-libro$/);
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
