import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { mockAudio, mockSpeech, played } from "./helpers.ts";

// indexul înregistrărilor generat la build: textul rostit → fișierul (relativ la /audio/)
const RECORDINGS = JSON.parse(readFileSync("src/data/generated/recordings.json", "utf8")) as Record<string, string>;

/** Apasă 🔊 până se aude înregistrarea (indexul se încarcă după pornire; până atunci vorbește vocea de sistem). */
async function playUntilRecorded(page: Page, name: string) {
  const button = page.getByRole("button", { name });
  await expect
    .poll(async () => {
      await button.click();
      return played(page);
    })
    .toContain(`/audio/${RECORDINGS["essere"]}`);
}

test("cuvintele A1 se redau din înregistrări (vocea lui Francesco)", async ({ page }) => {
  expect(RECORDINGS["essere"]).toMatch(/^words\/[0-9a-f]{16}\.mp3$/);
  await mockSpeech(page);
  await mockAudio(page);
  await page.goto("/browse/v-essere");
  await playUntilRecorded(page, "Ascultă pronunția: essere");
});

test("fără voce italiană în sistem, 🔊 apare la cuvintele cu înregistrare", async ({ page }) => {
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
  await mockAudio(page);
  await page.goto("/browse/v-essere");
  await playUntilRecorded(page, "Ascultă pronunția: essere");
});
