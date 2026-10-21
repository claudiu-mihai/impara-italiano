import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { seedConjCards, seedLearnedWords } from "./helpers.ts";

const CONJUGATIONS: Record<string, Record<string, string[][]>> = JSON.parse(
  readFileSync("src/data/generated/conjugations.json", "utf8"),
);
const PRESENTE = CONJUGATIONS["v-parlare"]!["presente"]!;
const WORDS_LEARNED = ["v-parlare"];

test("Flip: răstoarnă cardul, arată forma și notează cu cele 4 butoane", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await page.goto("/learn/conjugation");
  await expect(page.getByTestId("person")).toBeVisible();

  await page.getByRole("radio", { name: "Flip" }).click();
  await expect(page.getByRole("radio", { name: "Flip" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("flip-card")).toBeVisible();
  await expect(page.getByTestId("flip-answer")).toHaveCount(0);

  const person = (await page.getByTestId("person").textContent())!;
  const index = ["io", "tu", "lui/lei", "noi", "voi", "loro"].indexOf(person);
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect(page.getByTestId("flip-answer")).toContainText(PRESENTE[index]!.join(" / "));

  const rating = page.getByRole("group", { name: "Cât de bine ai știut forma?" });
  await expect(rating.getByRole("button")).toHaveCount(4);
  await rating.getByRole("button", { name: /^Ușor/ }).click();
  await expect(page.getByText("Sesiune încheiată")).toBeVisible();
});

test("Flip: tastele 1–4 notează după răsturnare", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Flip" }).click();
  await page.getByTestId("flip-card").click(); // scoate focusul de pe butonul variantei
  await page.keyboard.press("Space");
  await expect(page.getByTestId("flip-answer")).toBeVisible();
  await page.keyboard.press("4");
  await expect(page.getByText("Sesiune încheiată")).toBeVisible();
});

test("Tabel: toate persoanele deodată, nota rezultă din formele corecte", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Tabel" }).click();

  const table = page.getByTestId("conj-table");
  await expect(table.getByRole("textbox")).toHaveCount(6);
  const persons = ["io", "tu", "lui/lei", "noi", "voi", "loro"];
  for (const [i, person] of persons.entries()) await page.getByLabel(person, { exact: true }).fill(PRESENTE[i]![0]!);

  await page.getByRole("button", { name: "Verifică tabelul" }).click();
  await expect(page.getByTestId("table-score")).toHaveText("6 din 6 corecte");
  await expect(page.getByTestId("expected")).toHaveCount(0);

  await page.getByRole("button", { name: "Termină cardul" }).click();
  // cardul nou, notat „Bine”, mai revine în aceeași sesiune (pași de învățare)
  await expect(page.getByText(/^2 \/ 2$/).or(page.getByText("Sesiune încheiată"))).toBeVisible();
});

test("Tabel: formele greșite sunt marcate și se arată forma corectă", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Tabel" }).click();

  await page.getByLabel("io", { exact: true }).fill(PRESENTE[0]![0]!);
  await page.getByLabel("tu", { exact: true }).fill("sbagliato");
  // restul rămân goale
  await page.getByRole("button", { name: "Verifică tabelul" }).click();

  await expect(page.getByTestId("table-score")).toHaveText("1 din 6 corecte");
  await expect(page.getByTestId("expected")).toHaveCount(5);
  await expect(page.getByTestId("expected").first()).toContainText(PRESENTE[1]!.join(" / "));
});

test("Tabel: Enter trece la câmpul următor", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Tabel" }).click();
  await page.getByLabel("io", { exact: true }).fill("parlo");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("tu", { exact: true })).toBeFocused();
});

test("varianta aleasă se păstrează și se poate seta din Setări", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Flip" }).click();
  // alegerea se salvează asincron în IndexedDB; așteptăm să ajungă acolo înainte de reîncărcare
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("impara-italiano");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const row = await new Promise<{ conjugationMode?: string } | undefined>((resolve, reject) => {
          const request = db.transaction("settings").objectStore("settings").get("app");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        return row?.conjugationMode;
      }),
    )
    .toBe("flip");
  await page.reload();
  await expect(page.getByRole("radio", { name: "Flip" })).toHaveAttribute("aria-checked", "true");

  await page.goto("/settings");
  await page.getByLabel("Varianta de conjugare").selectOption("table");
  await page.goto("/learn/conjugation");
  await expect(page.getByRole("radio", { name: "Tabel" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("conj-table")).toBeVisible();
});

test("imperativul în Tabel are 5 rânduri (tu, Lei, noi, voi, Loro), fără «io»", async ({ page }) => {
  await seedLearnedWords(page, WORDS_LEARNED);
  await seedConjCards(page, [
    { verbId: "v-parlare", tense: "presente", stability: 30 },
    { verbId: "v-parlare", tense: "passatoProssimo", stability: 30 },
  ]);
  await page.goto("/learn/conjugation");
  await page.getByRole("radio", { name: "Tabel" }).click();
  await expect(page.getByText("Imperativ afirmativ (imperativo)")).toBeVisible();

  const table = page.getByTestId("conj-table");
  await expect(table.getByRole("textbox")).toHaveCount(5);
  const imperativo = CONJUGATIONS["v-parlare"]!["imperativo"]!;
  for (const [i, person] of ["tu", "Lei", "noi", "voi", "Loro"].entries()) {
    await page.getByLabel(person, { exact: true }).fill(imperativo[i]![0]!);
  }
  await page.getByRole("button", { name: "Verifică tabelul" }).click();
  await expect(page.getByTestId("table-score")).toHaveText("5 din 5 corecte");
});
