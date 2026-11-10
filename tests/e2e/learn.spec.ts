import { expect, test, type Page } from "@playwright/test";

const today = (page: Page) => page.getByRole("region", { name: "De făcut azi" });
const practice = (page: Page) => page.getByRole("region", { name: "Exersează liber" });

test("Învață: două grupe, „De făcut azi” și „Exersează liber”", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "De făcut azi", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Exersează liber", level: 2 })).toBeVisible();
  for (const name of [/^Flashcards/, /^Conjugare/]) await expect(today(page).getByRole("link", { name })).toBeVisible();
  for (const name of [/^Teme/, /^Gramatică/]) await expect(practice(page).getByRole("link", { name })).toBeVisible();
  // Reconstruire și Quiz sunt dezactivate până înveți cuvinte (nu sunt linkuri), dar stau tot în „Exersează liber”
  for (const title of ["Reconstruire propoziție", "Quiz"]) await expect(practice(page).getByText(title, { exact: true })).toBeVisible();
  await expect(today(page).getByRole("link", { name: /^Teme/ })).toHaveCount(0);
});

test("Învață: fără nicio temă deschisă nu există „Continuă”", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Exersează liber" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Continuă:/ })).toHaveCount(0);
});

test("Învață: „Continuă” duce la ultima temă deschisă, apoi la ultima lecție de gramatică", async ({ page }) => {
  await page.goto("/learn/topics/familia");
  await expect(page.getByRole("heading", { name: "La famiglia", level: 1 })).toBeVisible();
  await page.goto("/learn");
  const topicLink = practice(page).getByRole("link", { name: /^Continuă: La famiglia/ });
  await expect(topicLink).toHaveAttribute("href", "/learn/topics/familia");

  await page.goto("/learn/grammar/articoli");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/learn");
  await expect(practice(page).getByRole("link", { name: /^Continuă: Articolul hotărât/ })).toHaveAttribute(
    "href",
    "/learn/grammar/articoli",
  );
  await expect(page.getByRole("link", { name: /^Continuă: La famiglia/ })).toHaveCount(0);
});

test("Învață: „Continuă” către o temă care nu mai există nu apare, iar pagina se încarcă", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Exersează liber" })).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({ key: "lastPractice", value: { kind: "topic", id: "nu-exista" } });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Exersează liber" })).toBeVisible();
  await expect(practice(page).getByRole("link", { name: /^Teme/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Continuă:/ })).toHaveCount(0);
});
