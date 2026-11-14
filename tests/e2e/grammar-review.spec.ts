import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

interface GrammarTopic {
  id: string;
  title: string;
  items: { id: string; it: string; gap: string; ro: string }[];
}
// Aceleași lecții ca în aplicație (generate de `npm run build:data`)
const GRAMMAR: GrammarTopic[] = JSON.parse(readFileSync("src/data/generated/grammar.json", "utf8"));
const articoli = GRAMMAR.find((t) => t.id === "articoli")!;

/** Joacă o rundă „Introducere text” cu toate răspunsurile corecte. */
async function playTypeRound(page: Page, topic: GrammarTopic) {
  const prompt = page.getByTestId("grammar-prompt");
  const input = page.getByRole("textbox", { name: "Cuvântul care lipsește" });
  for (let step = 0; step < 10; step++) {
    const ro = (await prompt.locator("xpath=following-sibling::p").textContent())!;
    await input.fill(topic.items.find((i) => i.ro === ro)!.gap);
    await page.getByRole("button", { name: "Verifică" }).click();
    await page.getByRole("button", { name: /Continuă|Vezi rezultatul/ }).click();
  }
  await expect(page.getByRole("heading", { name: "10 din 10" })).toBeVisible();
}

/** Scrie direct în IndexedDB cardul de repetiție al unei lecții, scadent de ieri. */
async function seedDueLesson(page: Page, topicId: string) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cards", "readwrite");
      tx.objectStore("cards").put({
        cardId: `skill:grammar:${id}`,
        wordId: `grammar:${id}`,
        kind: "skill",
        variant: "auto",
        introducedOn: "2026-01-01",
        due: new Date(Date.now() - 86_400_000),
        stability: 5,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 5,
        learning_steps: 0,
        reps: 2,
        lapses: 0,
        state: 2,
        last_review: new Date(Date.now() - 6 * 86_400_000),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, topicId);
}

test("prima rundă „Introducere text” pune lecția în repetiție; a doua din aceeași zi e antrenament liber", async ({ page }) => {
  await page.goto("/learn/grammar/articoli");
  await expect(page.getByTestId("grammar-review")).toHaveText("Termină jocul „Introducere text” ca lecția să intre în repetiție.");

  await page.getByRole("link", { name: /Introducere text/ }).click();
  await expect(page.getByText("Repetiție", { exact: true })).toBeVisible();
  await playTypeRound(page, articoli);
  await expect(page.getByText(/Repetiția a fost notată; lecția revine la timpul potrivit\./)).toBeVisible();

  // „Încă o rundă”: aceeași zi, nu se mai notează
  await page.getByRole("button", { name: "Încă o rundă" }).click();
  await expect(page.getByText("Repetiție", { exact: true })).toHaveCount(0);
  await playTypeRound(page, articoli);
  await expect(page.getByText(/Antrenament liber: nu schimbă programul de repetare\./)).toBeVisible();

  // pe pagina lecției și în listă: următoarea repetiție, peste câteva zile (nu peste minute)
  await page.getByRole("link", { name: "Înapoi la temă" }).click();
  await expect(page.getByTestId("grammar-review")).toHaveText(/^Următoarea repetiție: peste \d+ zile?$/);
  await page.getByRole("link", { name: "Înapoi la Gramatică" }).click();
  const row = page.getByRole("list", { name: "Temele de gramatică" }).getByRole("link", { name: /Articolul/ });
  await expect(row.getByTestId("grammar-review")).toHaveText(/^Următoarea repetiție: peste \d+ zile?$/);
});

test("o lecție scadentă apare pe Acasă la „Gramatică de repetat” și se notează din nou", async ({ page }) => {
  await seedDueLesson(page, "articoli");
  await page.reload();
  const section = page.getByRole("region", { name: "Gramatică de repetat" });
  await expect(section).toBeVisible();
  await section.getByRole("link", { name: articoli.title }).click();
  await expect(page).toHaveURL(/\/learn\/grammar\/articoli\/type$/);
  await expect(page.getByText("Repetiție", { exact: true })).toBeVisible();

  await page.goto("/learn/grammar");
  const row = page.getByRole("list", { name: "Temele de gramatică" }).getByRole("link", { name: /Articolul/ });
  await expect(row.getByTestId("grammar-review")).toHaveText("De repetat");
});

test("fără lecții scadente, Acasă nu are secțiunea de gramatică", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Gramatică de repetat" })).toHaveCount(0);
});
