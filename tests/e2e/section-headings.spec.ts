import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/learn",
  "/learn/topics",
  "/learn/topics/familia",
  "/learn/grammar/articoli",
  "/browse/v-parlare",
  "/stats",
  "/settings",
];

test("titlurile de secțiune sunt text normal, nu majuscule (casetele „De reținut” rămân cum sunt)", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.waitForTimeout(300);
    const uppercase = await page.getByRole("heading", { level: 2 }).evaluateAll((headings) =>
      headings
        .filter((h) => !h.querySelector("button[aria-expanded]")) // titlurile de casetă sunt butoane
        .filter((h) => getComputedStyle(h).textTransform === "uppercase")
        .map((h) => h.textContent?.trim()),
    );
    expect(uppercase, `${path}: titluri cu majuscule`).toEqual([]);
  }
});
