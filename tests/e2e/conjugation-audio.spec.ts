import { expect, test, type Page } from "@playwright/test";

/**
 * Înlocuiește Web Speech API cu o voce italiană locală care „redă” fiecare frază în 300 ms, în ordine,
 * cu evenimentele onstart / onend, ca seriile și oprirea să se poată verifica. `__played` reține frazele
 * care au început efectiv (nu doar cele puse în coadă).
 */
async function mockSpeech(page: Page) {
  await page.addInitScript(() => {
    type U = { text: string; rate: number; lang: string; onstart?: () => void; onend?: () => void };
    const played: { text: string; rate: number }[] = [];
    (window as unknown as { __played: typeof played }).__played = played;
    let queue: U[] = [];
    let timer: number | undefined;
    let busy = false;
    const next = () => {
      const u = queue.shift();
      busy = u !== undefined;
      if (!u) return;
      played.push({ text: u.text, rate: u.rate });
      u.onstart?.();
      timer = window.setTimeout(() => {
        u.onend?.();
        next();
      }, 300);
    };
    class Utterance {
      text: string;
      lang = "";
      rate = 1;
      voice?: unknown;
      onstart?: () => void;
      onend?: () => void;
      onerror?: () => void;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ name: "Alice", lang: "it-IT", localService: true, voiceURI: "mac:alice" }],
        speak: (u: U) => {
          queue.push(u);
          if (!busy) next();
        },
        cancel: () => {
          queue = [];
          window.clearTimeout(timer);
          busy = false;
        },
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });
}

const played = (page: Page) =>
  page.evaluate(() => (window as unknown as { __played: { text: string; rate: number }[] }).__played);

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
});

test("sesiunea de conjugare: audio doar la apăsare, cu pronume, și varianta 🐢", async ({ page }) => {
  // „Știu deja” deblochează conjugarea verbului
  await page.goto("/browse/v-parlare");
  await page.getByRole("button", { name: "Știu deja acest cuvânt" }).click();
  await expect(page.getByText("În învățare", { exact: true })).toBeVisible();

  await page.goto("/learn/conjugation");
  await expect(page.getByText("Timp nou")).toBeVisible();

  // infinitivul de pe fața cardului
  await page.getByRole("button", { name: "Ascultă pronunția: parlare" }).click();
  await expect.poll(async () => (await played(page)).map((p) => p.text)).toEqual(["parlare"]);

  const pronoun = ((await page.getByTestId("person").textContent()) ?? "").split("/")[0]!.trim();
  await page.getByLabel(/Forma pentru/).fill("xyz");
  await page.getByRole("button", { name: "Verifică" }).click();
  const correct = ((await page.getByText(/^Răspuns corect:/).textContent()) ?? "").replace("Răspuns corect:", "").trim();

  // fără redare automată: după „Verifică” nu s-a rostit nimic nou
  await page.waitForTimeout(500);
  expect(await played(page)).toHaveLength(1);

  const spoken = `${pronoun} ${correct}`;
  await page.getByRole("button", { name: `Ascultă pronunția: ${spoken}` }).click();
  await page.getByRole("button", { name: `Ascultă rar: ${spoken}` }).click();
  await expect.poll(async () => (await played(page)).slice(1)).toEqual([
    { text: spoken, rate: 0.9 },
    { text: spoken, rate: 0.6 },
  ]);
});

test("pagina verbului: tap pe rând, „Ascultă tot” în ordine și „Oprește”", async ({ page }) => {
  await page.goto("/browse/v-andare");
  const presente = page.locator("details", { hasText: "Prezent (presente)" });

  await presente.getByRole("button", { name: "vanno" }).click();
  await expect.poll(async () => (await played(page)).map((p) => p.text)).toEqual(["loro vanno"]);

  await presente.getByRole("button", { name: "▶ Ascultă tot" }).click();
  await expect(presente.getByRole("button", { name: "■ Oprește" })).toBeVisible();
  await expect(presente.locator("tr[aria-current='true']")).toBeVisible();
  await expect(presente.getByRole("button", { name: "▶ Ascultă tot" })).toBeVisible({ timeout: 5000 });
  expect((await played(page)).slice(1).map((p) => p.text)).toEqual([
    "io vado",
    "tu vai",
    "lui va",
    "noi andiamo",
    "voi andate",
    "loro vanno",
  ]);

  // oprirea: seria nu continuă
  await presente.getByRole("button", { name: "▶ Ascultă tot" }).click();
  await presente.getByRole("button", { name: "■ Oprește" }).click();
  await expect(presente.getByRole("button", { name: "▶ Ascultă tot" })).toBeVisible();
  await page.waitForTimeout(800);
  expect((await played(page)).slice(7).length).toBe(1);
});

test("imperativul și congiuntivo se rostesc ca în vorbire", async ({ page }) => {
  await page.goto("/browse/v-andare");
  const imperativo = page.locator("details", { hasText: "Imperativ afirmativ (imperativo)" });
  await imperativo.getByText("Imperativ afirmativ (imperativo)").click();
  await imperativo.getByRole("button", { name: "va' / vai" }).click();

  const congiuntivo = page.locator("details", { hasText: "Conjunctiv (congiuntivo presente)" });
  await congiuntivo.getByText("Conjunctiv (congiuntivo presente)").click();
  await congiuntivo.getByRole("button", { name: "vadano" }).click();

  await expect.poll(async () => (await played(page)).map((p) => p.text)).toEqual(["Vai!", "che loro vadano"]);
});
