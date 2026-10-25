import { expect, test, type Page } from "@playwright/test";

const language = (page: Page) => page.getByLabel("Limba interfeței / Lingua dell'interfaccia");
const nav = (page: Page) => page.getByRole("navigation");

async function useItalian(page: Page) {
  await page.goto("/settings");
  await language(page).selectOption("it");
  await expect(page.getByRole("heading", { name: "Impostazioni", level: 1 })).toBeVisible();
}

test("implicit interfața e în română, cu <html lang> ro", async ({ page }) => {
  await page.goto("/settings");
  await expect(language(page)).toHaveValue("ro");
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await expect(nav(page).getByRole("link", { name: "Acasă" })).toBeVisible();
});

test("trecerea în italiană schimbă imediat navigarea, Setările și <html lang>", async ({ page }) => {
  await useItalian(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  const names = ["Home", "Impara", "Dizionario", "Statistiche", "Impostazioni"];
  for (const name of names) await expect(nav(page).getByRole("link", { name })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Acasă" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Studio", level: 2 })).toBeVisible();
  await expect(page.getByLabel("Livello attuale")).toBeVisible();
  await expect(page.getByRole("button", { name: "Esporta i progressi" })).toBeVisible();
  // eticheta câmpului rămâne în ambele limbi, ca să poți reveni
  await expect(language(page)).toHaveValue("it");
});

test("limba se păstrează după reîncărcare și se poate reveni la română", async ({ page }) => {
  await useItalian(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(nav(page).getByRole("link", { name: "Impara" })).toBeVisible();

  await language(page).selectOption("ro");
  await expect(page.getByRole("heading", { name: "Setări", level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await page.reload();
  await expect(nav(page).getByRole("link", { name: "Acasă" })).toBeVisible();
});

test("Acasă, Învață, Dicționar și Statistici apar în italiană", async ({ page }) => {
  await useItalian(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Oggi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inizia la sessione" })).toBeVisible();

  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Impara", level: 1 })).toBeVisible();
  await expect(page.getByText("Ricostruisci la frase")).toBeVisible();
  await expect(page.getByRole("link", { name: /Giochi/ })).toBeVisible();

  await page.goto("/browse");
  await expect(page.getByRole("heading", { name: "Dizionario", level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder("Cerca in italiano o rumeno")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /parole$/ })).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Statistiche", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Serie di giorni" })).toBeVisible();
});

test("traducerile cuvintelor rămân în limba maternă, marcate lang=ro", async ({ page }) => {
  await useItalian(page);
  await page.goto("/browse/v-parlare");
  await expect(page.getByRole("heading", { name: "parlare", level: 1 })).toBeVisible();
  await expect(page.locator('[lang="ro"]').filter({ hasText: /^a vorbi/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Esempi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coniugazione" })).toBeVisible();
  // categoria gramaticală și butoanele sunt în italiană
  await expect(page.getByText("verbo", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "So già questa parola" })).toBeVisible();
});

test("în Teme, caseta „De reținut” își traduce comenzile, dar păstrează fața în română", async ({ page }) => {
  await useItalian(page);
  await page.goto("/learn/topics/familia");
  await expect(page.getByRole("link", { name: "Torna a Temi" })).toBeVisible();
  await page.getByRole("button", { name: "Da ricordare" }).click();
  await page.getByRole("button", { name: "Mostra in rumeno" }).click();
  await expect(page.getByTestId("rules-box")).toHaveAttribute("data-face", "native");
  // conținutul feței în limba maternă rămâne în română
  await expect(page.getByText(/Cu rudele la singular/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "De reținut" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mostra in italiano" })).toBeVisible();
});

test("sesiunea de Flashcards și Quiz în italiană", async ({ page }) => {
  await useItalian(page);
  await page.goto("/learn/vocab");
  await expect(page.getByRole("button", { name: "Mostra la risposta" })).toBeVisible();
  await page.getByRole("button", { name: "Mostra la risposta" }).click();
  for (const name of [/^Ancora/, /^Difficile/, /^Bene/, /^Facile/]) await expect(page.getByRole("button", { name })).toBeVisible();
  await expect(page.getByRole("group", { name: "Quanto bene conoscevi la parola?" })).toBeVisible();
  // intervalele se scriu în italiană (giorni, min…)
  await expect(page.getByRole("button", { name: /^Bene/ })).toContainText(/min|giorn|h$/);
});

test("secțiunea Cont și mesajele de validare în italiană", async ({ page }) => {
  await useItalian(page);
  await expect(page.getByRole("heading", { name: "Conto", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Nuovo conto" }).click();
  await page.getByLabel("Email").fill("x@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Conferma la password").fill("short");
  await page.getByRole("button", { name: "Crea conto" }).click();
  await expect(page.getByRole("alert")).toHaveText("La password deve avere almeno 8 caratteri.");
});

test("textul rămâne în română când nu se alege italiana (suita existentă)", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Învață", level: 1 })).toBeVisible();
  await expect(page.getByText("Reconstruire propoziție")).toBeVisible();
});
