import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { seedLearnedWords } from "./helpers.ts";

const LEARNED = ["v-essere", "v-avere", "v-fare", "v-dire", "v-andare", "v-parlare"];

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(summary, `${label}: probleme de accesibilitate`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`accesibilitate (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test("ecranele principale", async ({ page }) => {
      await seedLearnedWords(page, LEARNED);

      for (const [path, ready] of [
        ["/", "Impara l'italiano con Lupino"],
        ["/learn", "Învață"],
        ["/browse", "Dicționar"],
        ["/browse/v-parlare", "parlare"],
        ["/stats", "Statistici"],
        ["/settings", "Setări"],
        ["/about", "Despre"],
        ["/learn/topics", "Teme"],
        ["/learn/topics/zilele-saptamanii", "Zilele săptămânii"],
        ["/learn/topics/ora", "Ora"],
      ] as const) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: ready }).first()).toBeVisible();
        await audit(page, path);
      }
    });

    test("exercițiile din Teme", async ({ page }) => {
      await page.goto("/learn/topics/culori/match");
      await expect(page.getByRole("heading", { name: "Potrivește perechile" })).toBeVisible();
      await audit(page, "potrivește perechi");

      await page.goto("/learn/topics/zilele-saptamanii/order");
      await expect(page.getByRole("heading", { name: "Pune elementele în ordine" })).toBeVisible();
      await audit(page, "ordonează");

      await page.goto("/learn/topics/pozitia-obiectelor/cat");
      await expect(page.getByRole("heading", { name: "Unde e Lupino?" })).toBeVisible();
      await audit(page, "unde e Lupino");

      await page.goto("/learn/topics/ora/clock");
      await expect(page.getByText("Repetiție")).toBeVisible();
      await audit(page, "ceasul");

      await page.goto("/learn/topics/numere-0-20/numbers");
      await expect(page.getByText("Repetiție")).toBeVisible();
      await audit(page, "numere");
    });

    test("sesiunile de studiu", async ({ page }) => {
      await seedLearnedWords(page, LEARNED);

      await page.goto("/learn/vocab");
      await expect(page.getByTestId("card-front")).toBeVisible();
      await audit(page, "flashcards (față)");
      await page.getByRole("button", { name: "Arată răspunsul" }).click();
      await expect(page.getByTestId("card-back")).toBeVisible();
      await page.waitForTimeout(500); // animația de rotire
      await audit(page, "flashcards (spate)");

      await page.goto("/quiz");
      await expect(page.getByRole("group", { name: "Variante de răspuns" })).toBeVisible();
      await audit(page, "quiz (întrebare)");
      await page.getByRole("group", { name: "Variante de răspuns" }).getByRole("button").first().click();
      await expect(page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ })).toBeVisible();
      await audit(page, "quiz (răspuns)");

      await page.goto("/learn/sentence");
      await expect(page.getByText("Scrie în italiană:")).toBeVisible();
      await audit(page, "reconstruire");

      await page.goto("/learn/conjugation");
      await expect(page.getByTestId("person")).toBeVisible();
      await audit(page, "conjugare");

      await page.getByRole("radio", { name: "Flip" }).click();
      await expect(page.getByTestId("flip-card")).toBeVisible();
      await audit(page, "conjugare (Flip, față)");
      await page.getByRole("button", { name: "Arată răspunsul" }).click();
      await expect(page.getByTestId("flip-answer")).toBeVisible();
      await audit(page, "conjugare (Flip, spate)");

      await page.getByRole("radio", { name: "Tabel" }).click();
      await expect(page.getByTestId("conj-table")).toBeVisible();
      await audit(page, "conjugare (Tabel)");
      await page.getByLabel("io", { exact: true }).fill("sbagliato");
      await page.getByRole("button", { name: "Verifică tabelul" }).click();
      await expect(page.getByTestId("table-score")).toBeVisible();
      await audit(page, "conjugare (Tabel, verificat)");
    });
  });
}
