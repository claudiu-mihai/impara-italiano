import { expect, test, type Page } from "@playwright/test";

const PARLARE_PRESENTE: Record<string, string> = {
  io: "parlo",
  tu: "parli",
  "lui/lei": "parla",
  noi: "parliamo",
  voi: "parlate",
  loro: "parlano",
};

/** Învață `count` cuvinte noi din Flashcards, notându-le cu „Ușor”. */
async function learnWords(page: Page, count: number) {
  await page.goto("/learn/vocab");
  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: "Arată răspunsul" }).click();
    await page.getByRole("button", { name: /^Ușor/ }).click();
    // contorul avansează după ce nota a fost salvată în IndexedDB
    await expect(page.getByText(new RegExp(`^${i + 2} / \\d+$`))).toBeVisible();
  }
}

/** Scrie direct în IndexedDB un card de vocabular aflat în faza de repetare (verbul „învățat”). */
async function seedLearnedVerb(page: Page, wordId: string) {
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
        cardId: `vocab:${id}:it-ro`,
        wordId: id,
        kind: "vocab",
        variant: "it-ro",
        introducedOn: "2026-01-01",
        due: new Date(Date.now() + 5 * 86_400_000),
        stability: 10,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 5,
        learning_steps: 0,
        reps: 3,
        lapses: 0,
        state: 2,
        last_review: new Date(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, wordId);
}

test("pagina „Învață” listează cele trei moduri, iar bara de jos dispare în sesiune", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("link", { name: /^Flashcards/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Conjugare/ })).toBeVisible();
  // Quiz-ul și Reconstruirea de propoziții cer cuvinte deja învățate
  await expect(page.getByText("Învață mai întâi câteva cuvinte")).toHaveCount(2);
  await expect(page.getByText("Reconstruire propoziție")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigare principală" })).toBeVisible();

  await page.getByRole("link", { name: /^Flashcards/ }).click();
  await expect(page.getByRole("button", { name: "Arată răspunsul" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigare principală" })).toHaveCount(0);
});

test("quiz: fără cuvinte învățate nu există întrebări", async ({ page }) => {
  await page.goto("/quiz");
  await expect(page.getByText("Încă nu ai cuvinte de testat")).toBeVisible();
});

test("quiz: o rundă cu 4 variante, feedback și scor final", async ({ page }) => {
  await learnWords(page, 3);
  await page.goto("/quiz");
  await expect(page.getByText("1 / 3")).toBeVisible();

  for (let i = 0; i < 3; i++) {
    const options = page.getByRole("group", { name: "Variante de răspuns" }).getByRole("button");
    await expect(options).toHaveCount(4);
    await options.first().click();
    await expect(page.getByText(/^(Corect!|Nu chiar\.)$/)).toBeVisible();
    // după răspuns, varianta corectă este marcată pentru cititoarele de ecran
    await expect(page.getByText("(răspuns corect)").or(page.getByText("(răspunsul tău, greșit)")).first()).toBeAttached();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }

  await expect(page.getByText(/^\d din 3$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Încă o rundă" })).toBeVisible();
});

test("conjugare: se deblochează după vocabular și se corectează automat", async ({ page }) => {
  // Fără verb învățat conjugarea este blocată.
  await page.goto("/learn/conjugation");
  await expect(page.getByText("Nimic de conjugat acum")).toBeVisible();

  await seedLearnedVerb(page, "v-parlare");
  await page.goto("/learn/conjugation");
  await expect(page.getByText("Timp nou")).toBeVisible();
  await expect(page.getByText("parlare", { exact: true })).toBeVisible();
  await expect(page.getByText("Prezent (presente)")).toBeVisible();

  // Trei persoane: două corecte (cu litere mari și spații în plus) și una greșită.
  for (let step = 0; step < 3; step++) {
    const person = (await page.getByTestId("person").textContent())!.trim();
    const expected = PARLARE_PRESENTE[person]!;
    await page.getByLabel(/^Forma pentru/).fill(step === 2 ? "greșit" : `  ${expected.toUpperCase()} `);
    await page.getByRole("button", { name: "Verifică" }).click();

    if (step === 2) await expect(page.getByText(`Răspuns corect: ${expected}`)).toBeVisible();
    else await expect(page.getByText("Corect!")).toBeVisible();

    await page.getByRole("button", { name: /^(Continuă|Termină cardul)$/ }).click();
  }

  // 2/3 → Greu: cardul rămâne în (re)învățare și revine în aceeași sesiune.
  await expect(page.getByText("2 / 2")).toBeVisible();
});

test("conjugare: butoanele cu accente inserează litera în câmp", async ({ page }) => {
  await seedLearnedVerb(page, "v-parlare");
  await page.goto("/learn/conjugation");
  const input = page.getByLabel(/^Forma pentru/);
  await input.fill("parler");
  await page.getByRole("button", { name: "ò", exact: true }).click();
  await expect(input).toHaveValue("parlerò");
});

test("statistici: repetițiile de azi apar în serie și în progres", async ({ page }) => {
  await learnWords(page, 2);
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Statistici" })).toBeVisible();
  await expect(page.getByText(/Azi: 2 din 10 repetiții/)).toBeVisible();
  await expect(page.getByTestId("streak")).toContainText("0");
  // 2 repetiții azi: o zi de studiu (sub pragul seriei), fără serie record
  await expect(page.getByTestId("active-days")).toContainText("1");
  await expect(page.getByTestId("longest-streak")).toContainText("0");
  await expect(page.getByRole("heading", { name: "Calendar de activitate" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Activitate în ultimele 16 săptămâni: 1 zi cu repetiții/ })).toBeVisible();
  await expect(page.getByText(/2 în învățare|0 stăpânite din 50/).first()).toBeVisible();
});

test("setări: o schimbare se salvează și influențează sesiunea", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Cuvinte noi pe zi").selectOption("5");
  await page.goto("/");
  await expect(page.getByText(/5 cuvinte noi/)).toBeVisible();
});

test("backup: export → ștergere → import readuce progresul", async ({ page }, testInfo) => {
  await learnWords(page, 2);
  await page.goto("/settings");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportă progresul" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^impara-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath("backup.json");
  await download.saveAs(file);

  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Șterge tot progresul" }).click();
  await expect(page.getByText("Progresul a fost șters.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(/10 cuvinte noi/)).toBeVisible();

  await page.goto("/settings");
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText("Progres importat.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/8 cuvinte noi/)).toBeVisible();
});

test("backup: un fișier greșit primește un mesaj clar și nu șterge nimic", async ({ page }, testInfo) => {
  await learnWords(page, 1);
  await page.goto("/settings");

  const bad = testInfo.outputPath("bad.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(bad, JSON.stringify({ format: "altceva" }));
  page.on("dialog", (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(bad);
  await expect(page.getByText("Fișierul nu este un backup Impara l'Italiano.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/9 cuvinte noi/)).toBeVisible();
});

test("setări: explicațiile se deschid și se închid din butonul (i)", async ({ page }) => {
  await page.goto("/settings");
  const row = page.locator("div.py-1", { hasText: "Retenție țintă" });
  const info = row.getByRole("button", { name: "Informații" });
  const text = page.getByText("Mai mare = mai multe repetiții.");

  // explicația nu mai stă afișată în rând, ci în caseta de după (i)
  await expect(text).toHaveCount(0);
  await expect(info).toHaveAttribute("aria-expanded", "false");

  await info.click();
  await expect(info).toHaveAttribute("aria-expanded", "true");
  await expect(text).toBeVisible();

  await info.click();
  await expect(text).toHaveCount(0);
  // controlul rămâne câmpul cu numele lui; butonul (i) nu e luat drept câmp
  await expect(page.getByLabel("Retenție țintă")).toHaveCount(1);
});
