import { expect, test, type Page } from "@playwright/test";
import { mockSpeech, seedLearnedWords, setListenFirst, spoken, WORDS } from "./helpers.ts";

const SEEDED = WORDS.slice(0, 3);

/**
 * Parcurge sesiunea până la primul card început (IT → RO, scadent). Cuvintele noi se introduc cu text și audio, deci
 * le notăm și mergem mai departe.
 */
async function skipNewCards(page: Page): Promise<void> {
  for (let i = 0; i < 16; i++) {
    await expect(page.getByTestId("card-front")).toBeVisible();
    const isNew = await page.getByText(/^(Cuvânt nou|Nou: acum spune-l în italiană)$/).isVisible();
    if (!isNew) return;
    await page.getByRole("button", { name: "Arată răspunsul" }).click();
    await page.getByRole("button", { name: /^Ușor/ }).click();
    await expect(page.getByText(new RegExp(`^${i + 2} / \\d+$`))).toBeVisible();
  }
  throw new Error("nu a apărut niciun card de recapitulare");
}

test("card început: doar audio (se aude singur), textul apare cu „Arată textul”", async ({ page }) => {
  await mockSpeech(page);
  await seedLearnedWords(page, SEEDED.map((w) => w.id), -1);
  await page.goto("/learn/vocab");
  await skipNewCards(page);

  const front = page.getByTestId("card-front");
  await expect(front.getByText("Ascultă cuvântul")).toBeVisible();
  // niciun cuvânt italian nu se vede înainte de cerere
  for (const w of SEEDED) await expect(front.getByText(w.it, { exact: true })).toHaveCount(0);
  const heard = (await spoken(page)).at(-1)!;
  expect(SEEDED.map((w) => w.it)).toContain(heard);

  await front.getByRole("button", { name: "Arată textul" }).click();
  await expect(front.getByText(heard, { exact: true })).toBeVisible();
  // întoarcerea cardului merge ca înainte
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await expect(page.getByTestId("card-back")).toBeVisible();
});

test("cu „Ascultă întâi” oprit, cardul început arată textul ca înainte", async ({ page }) => {
  await mockSpeech(page);
  await setListenFirst(page, false);
  await seedLearnedWords(page, SEEDED.map((w) => w.id), -1);
  await page.goto("/learn/vocab");
  await skipNewCards(page);
  await expect(page.getByText("Ascultă cuvântul")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Arată textul" })).toHaveCount(0);
});

test("fără voce italiană, cardul rămâne cu text chiar și cu „Ascultă întâi” pornit", async ({ page }) => {
  // dispozitiv cu voci, dar niciuna italiană: „no-voice”, deci nimic de ascultat
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ name: "Alex", lang: "en-US", localService: true, voiceURI: "mac:alex" }],
        speak: () => {},
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });
  await seedLearnedWords(page, SEEDED.map((w) => w.id), -1);
  await page.goto("/learn/vocab");
  await skipNewCards(page);
  await expect(page.getByText("Ascultă cuvântul")).toHaveCount(0);
});

test("„Ascultă întâi” se poate opri din Setări, iar valoarea se păstrează", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Ascultă întâi")).toBeChecked();
  await setListenFirst(page, false);
  await page.reload();
  await expect(page.getByLabel("Ascultă întâi")).not.toBeChecked();
});
