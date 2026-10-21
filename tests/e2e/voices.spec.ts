import { expect, test, type Page } from "@playwright/test";

interface MockVoice {
  name: string;
  lang: string;
  localService: boolean;
  voiceURI: string;
}

const ALICE = { name: "Alice", lang: "it-IT", localService: true, voiceURI: "mac:alice" };
const LUCA = { name: "Luca (Enhanced)", lang: "it-IT", localService: true, voiceURI: "mac:luca" };
const GOOGLE = { name: "Google italiano", lang: "it-IT", localService: false, voiceURI: "net:google-it" };
const SAMANTHA = { name: "Samantha", lang: "en-US", localService: true, voiceURI: "mac:samantha" };

/** Înlocuiește Web Speech API cu o variantă care înregistrează ce s-ar fi redat. */
async function mockSpeech(page: Page, voices: MockVoice[]) {
  await page.addInitScript((list) => {
    const spoken: { text: string; voice?: string; lang: string; rate: number }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    class Utterance {
      text: string;
      lang = "";
      rate = 1;
      voice?: { voiceURI: string };
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => list,
        speak: (u: Utterance) => spoken.push({ text: u.text, voice: u.voice?.voiceURI, lang: u.lang, rate: u.rate }),
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  }, voices);
}

const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: { text: string; voice?: string; lang: string }[] }).__spoken);

test("vocea din sistem este folosită și fără internet, cu cea de calitate superioară preferată", async ({ page, context }) => {
  await mockSpeech(page, [GOOGLE, ALICE, LUCA, SAMANTHA]);
  await page.goto("/learn/vocab");
  await expect(page.getByTestId("card-front")).toBeVisible();

  await context.setOffline(true);
  const audio = page.getByRole("button", { name: "Ascultă pronunția: essere" });
  await expect(audio).toBeEnabled();
  await audio.click();

  expect(await spoken(page)).toEqual([expect.objectContaining({ text: "essere", voice: "mac:luca", lang: "it-IT" })]);
});

test("online, vocea locală este preferată celei de rețea", async ({ page }) => {
  await mockSpeech(page, [GOOGLE, ALICE]);
  await page.goto("/learn/vocab");
  await page.getByRole("button", { name: "Ascultă pronunția: essere" }).click();
  expect((await spoken(page))[0]?.voice).toBe("mac:alice");
});

test("fără voce locală și fără internet, butonul de audio este inactiv", async ({ page, context }) => {
  await mockSpeech(page, [GOOGLE, SAMANTHA]);
  await page.goto("/learn/vocab");
  await expect(page.getByRole("button", { name: "Ascultă pronunția: essere" })).toBeEnabled();

  await context.setOffline(true);
  await expect(page.getByTestId("card-front").getByRole("button", { name: "Audio necesită internet" })).toBeDisabled();
});

test("vocea aleasă în Setări se folosește la pronunție", async ({ page }) => {
  await mockSpeech(page, [ALICE, LUCA]);
  await page.goto("/settings");
  await page.getByLabel("Vocea italiană").selectOption("mac:alice");
  await page.getByRole("button", { name: /Ascultă vocea/ }).click();
  expect((await spoken(page))[0]).toMatchObject({ voice: "mac:alice", lang: "it-IT" });

  await page.goto("/learn/vocab");
  await page.getByRole("button", { name: "Ascultă pronunția: essere" }).click();
  expect((await spoken(page)).at(-1)?.voice).toBe("mac:alice");
});

test("fără nicio voce italiană: audio ascuns și mesaj cu instrucțiuni pentru Mac", async ({ page }) => {
  await mockSpeech(page, [SAMANTHA]);
  await page.goto("/learn/vocab");
  await expect(page.getByRole("button", { name: /Ascultă pronunția/ })).toHaveCount(0);
  await expect(page.getByText(/Mac: Setări de sistem/)).toBeVisible();
});

const MS_ONLINE = {
  name: "Microsoft Elsa Online (Natural) - Italian (Italy)",
  lang: "it-IT",
  localService: true, // Edge o declară „locală”, deși trimite textul pe internet
  voiceURI: "ms:elsa-online",
};

test("Edge pe Mac: vocea macOS este aleasă în loc de vocea Microsoft Online care apare prima", async ({ page }) => {
  await mockSpeech(page, [MS_ONLINE, ALICE, SAMANTHA]);
  await page.goto("/learn/vocab");
  await page.getByRole("button", { name: "Ascultă pronunția: essere" }).click();
  expect((await spoken(page))[0]?.voice).toBe("mac:alice");
});

test("Edge: doar vocea Microsoft Online și fără internet → audio inactiv", async ({ page, context }) => {
  await mockSpeech(page, [MS_ONLINE]);
  await page.goto("/learn/vocab");
  await expect(page.getByRole("button", { name: "Ascultă pronunția: essere" })).toBeEnabled();

  await context.setOffline(true);
  await expect(page.getByTestId("card-front").getByRole("button", { name: "Audio necesită internet" })).toBeDisabled();
});

test("diagnostic: arată vocile expuse, tipul lor și vocea aleasă", async ({ page }) => {
  await mockSpeech(page, [MS_ONLINE, ALICE, SAMANTHA]);
  await page.goto("/settings");
  await page.getByText("Diagnostic voci").click();

  await expect(page.getByText("3 voci expuse de browser")).toBeVisible();
  await expect(page.getByText("Alice · it-IT · sistem")).toBeVisible();
  await expect(page.getByText(`${MS_ONLINE.name} · it-IT · cloud (declarată locală)`)).toBeVisible();
  await expect(page.getByText("Vocea folosită acum:")).toContainText("Alice (it-IT)");
});
