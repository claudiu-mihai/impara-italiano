import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockAudio, mockSpeech, played, seedLearnedWords, spoken, WORDS } from "./helpers.ts";

// cardurile pe care ecranul le știe afișa; se completează odată cu fiecare etapă a fluxului
const PASSIVE = ["knownWord", "sentence", "rule", "lines", "didYouKnow", "pack", "newWord", "review", "grid", "trueFalse", "gap", "packQuiz"];

const active = (page: Page) => page.locator('[data-feed-card][data-active="true"]');
const startButton = (page: Page) => page.getByRole("button", { name: "Atinge ca să începi" });
/** Frazele rostite, fără fraza goală cu care se deblochează redarea. */
const said = async (page: Page) => (await spoken(page)).filter(Boolean);

/**
 * Așteaptă să se termine derularea: cardul activ e aliniat sus în flux. Un card devine activ de la 60% vizibil, deci
 * în timpul derulării line; un clic dat atunci ar derula pagina (Playwright aduce butonul în vizor) și ar muta cardul activ.
 */
async function settle(page: Page) {
  await expect
    .poll(() => active(page).evaluate((card) => Math.abs(card.getBoundingClientRect().top - card.parentElement!.getBoundingClientRect().top) < 2))
    .toBe(true);
}

async function startFeed(page: Page) {
  await page.goto("/feed");
  await startButton(page).click();
  await expect.poll(() => active(page).getAttribute("data-feed-type")).not.toBe("start");
  await settle(page);
}

/** Derulează `n` carduri cu tastatura, așteptând de fiecare dată să se schimbe cardul activ și să se oprească derularea. */
async function scrollDown(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const key = await active(page).getAttribute("data-feed-key");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => active(page).getAttribute("data-feed-key")).not.toBe(key);
    await settle(page);
  }
}

const cardTypes = (page: Page) => page.locator("[data-feed-card]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.feedType));


interface PackEntry {
  id: string;
  kind: string;
  level: string;
}
const PACK: PackEntry[] = JSON.parse(readFileSync("src/data/generated/feed.json", "utf8"));

/** Scrie în IndexedDB ce s-a „văzut” din pachet (cheia `feedSeen` din `meta`). */
async function seedFeedSeen(page: Page, seen: Record<string, { shown?: number; quizzed?: number }>) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({ key: "feedSeen", value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, seen);
}

/** Derulează până când cardul activ e de tipul cerut (cel mult `max` carduri). */
async function scrollToType(page: Page, type: string, max = 30) {
  for (let i = 0; i < max; i++) {
    if ((await active(page).getAttribute("data-feed-type")) === type) return;
    await scrollDown(page, 1);
  }
  throw new Error(`niciun card ${type} în ${max} carduri`);
}

/** Toate rândurile unui tabel din IndexedDB. */
async function idbAll(page: Page, store: string) {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows;
  }, store);
}

const A1_IDS = WORDS.filter((w) => w.level === "A1").map((w) => w.id);
const TESTS = ["grid", "trueFalse", "gap", "packQuiz"];

/** Răspunde la cardul de test activ: varianta corectă sau una greșită. */
async function answerTest(page: Page, correct: boolean) {
  const card = active(page);
  const choices = card.locator("[data-choice]");
  const target = correct ? card.locator('[data-choice][data-correct]') : card.locator("[data-choice]:not([data-correct])").first();
  await expect(choices.first()).toBeVisible();
  await target.first().click();
}

/** Derulează până la un card de test și răspunde. */
async function nextTest(page: Page, correct: boolean) {
  for (let i = 0; i < 20; i++) {
    if (TESTS.includes((await active(page).getAttribute("data-feed-type")) ?? "")) break;
    await scrollDown(page, 1);
  }
  await answerTest(page, correct);
  await scrollDown(page, 1);
}

test.describe("Flux", () => {
  test.beforeEach(async ({ page }) => {
    await mockSpeech(page);
  });

  test("instalare nouă: cardul de start, apoi carduri fără sfârșit", async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/feed");
    await expect(startButton(page)).toBeVisible();
    await startButton(page).click();
    await expect.poll(() => active(page).getAttribute("data-feed-type")).not.toBe("start");
    expect(PASSIVE).toContain(await active(page).getAttribute("data-feed-type"));
    await scrollDown(page, 30);
    expect(PASSIVE).toContain(await active(page).getAttribute("data-feed-type"));
    expect(errors).toEqual([]);
  });

  test("cu cuvinte învățate apar cuvinte cunoscute și propoziții", async ({ page }) => {
    test.setTimeout(120_000);
    const ids = WORDS.filter((w) => w.level === "A1").slice(0, 150).map((w) => `${w.id}`);
    await seedLearnedWords(page, ids);
    await startFeed(page);
    await scrollDown(page, 40);
    const types = await cardTypes(page);
    expect(types).toContain("knownWord");
    expect(types).toContain("sentence");
  });

  test("se aude doar cardul activ", async ({ page }) => {
    test.setTimeout(90_000);
    await startFeed(page);
    await expect.poll(() => said(page)).not.toEqual([]);
    await scrollDown(page, 2);
    // rapid: încă o derulare imediat, fără să așteptăm redarea; testele nu rostesc nimic singure, deci mergem până la un card care se aude
    do await scrollDown(page, 1);
    while (TESTS.includes((await active(page).getAttribute("data-feed-type")) ?? ""));
    await expect.poll(async () => {
      const last = (await said(page)).at(-1) ?? "";
      const text = (await active(page).textContent()) ?? "";
      return last !== "" && text.includes(last);
    }).toBe(true);
    // după ✕ nu se mai aude nimic nou
    await page.getByRole("link", { name: "Închide fluxul" }).click();
    const before = (await said(page)).length;
    await page.waitForTimeout(400);
    expect((await said(page)).length).toBe(before);
  });

  test("cu „Audio automat” oprit nu se aude nimic singur", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/settings");
    await page.getByLabel("Audio automat").click();
    await expect(page.getByLabel("Audio automat")).not.toBeChecked();
    await startFeed(page);
    await scrollDown(page, 5);
    expect(await said(page)).toEqual([]);
  });

  test("🔇 oprește sunetul pentru vizita curentă", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/feed");
    await page.getByRole("button", { name: "Oprește sunetul" }).click();
    await expect(page.getByRole("button", { name: "Pornește sunetul" })).toBeVisible();
    await startButton(page).click();
    await expect.poll(() => active(page).getAttribute("data-feed-type")).not.toBe("start");
    await scrollDown(page, 3);
    expect(await said(page)).toEqual([]);
  });

  test("cardurile din pachet apar și se aud cu înregistrarea lor", async ({ page }) => {
    test.setTimeout(90_000);
    await mockAudio(page);
    await startFeed(page);
    await scrollToType(page, "pack");
    await expect.poll(async () => (await played(page)).some((path) => path.startsWith("/audio/feed/"))).toBe(true);
  });

  test("un item văzut nu revine în vizita următoare", async ({ page }) => {
    test.setTimeout(120_000);
    await startFeed(page);
    await scrollToType(page, "pack");
    const firstKey = await active(page).getAttribute("data-feed-key");
    // după ce devine activ, itemul se salvează ca văzut; o nouă vizită nu-l mai arată
    await page.waitForTimeout(300);
    await page.goto("/feed");
    await startButton(page).click();
    await expect.poll(() => active(page).getAttribute("data-feed-type")).not.toBe("start");
    await scrollDown(page, 25);
    const keys = await page.locator("[data-feed-card]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.feedKey));
    expect(keys).not.toContain(firstKey);
  });

  test("micro-povestea își arată finalul la atingere", async ({ page }) => {
    test.setTimeout(90_000);
    const now = Date.now();
    // doar micro-poveștile A1 rămân eligibile: restul pachetului e „văzut” chiar acum
    const seen = Object.fromEntries(PACK.filter((p) => !(p.kind === "micro-storia" && p.level === "A1")).map((p) => [p.id, { shown: now }]));
    await seedFeedSeen(page, seen);
    await startFeed(page);
    await scrollToType(page, "pack");
    const card = active(page);
    const reveal = card.getByRole("button", { name: "Arată finalul" });
    await expect(reveal).toBeVisible();
    const before = await card.locator("li").count();
    await reveal.click();
    await expect(card.getByRole("button", { name: "Arată finalul" })).toHaveCount(0);
    expect(await card.locator("li").count()).toBe(before + 1);
  });

  test("o repetiție notată în flux apare în jurnal și iese din scadențe", async ({ page }) => {
    test.setTimeout(120_000);
    await seedLearnedWords(page, A1_IDS.slice(0, 3), -1);
    await startFeed(page);
    await scrollToType(page, "review");
    const card = active(page);
    await card.getByRole("button", { name: "Arată răspunsul" }).click();
    await card.getByRole("button", { name: /^Da/ }).click();
    await expect.poll(async () => (await idbAll(page, "reviewLog")).length).toBe(1);
    const [log] = await idbAll(page, "reviewLog");
    expect(log!.source).toBe("flashcard");
    const rated = (await idbAll(page, "cards")).find((c) => c.cardId === log!.cardId)!;
    expect(new Date(rated.due as string).getTime()).toBeGreaterThan(Date.now());
  });

  test("dublă atingere pe față, apoi „Da”: o singură notă", async ({ page }) => {
    test.setTimeout(120_000);
    await seedLearnedWords(page, A1_IDS.slice(0, 3), -1);
    await startFeed(page);
    await scrollToType(page, "review");
    const card = active(page);
    await card.getByTestId("feed-face").dblclick();
    await card.getByRole("button", { name: /^Da/ }).click({ timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    expect((await idbAll(page, "reviewLog")).length).toBe(1);
  });

  test("cu 0 cuvinte noi pe zi nu apare niciun cuvânt nou", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/settings");
    await page.getByLabel("Cuvinte noi pe zi").selectOption("0");
    await expect(page.getByLabel("Cuvinte noi pe zi")).toHaveValue("0");
    await startFeed(page);
    await scrollDown(page, 30);
    expect(await cardTypes(page)).not.toContain("newWord");
    expect(await idbAll(page, "cards")).toEqual([]);
  });

  test("după un cuvânt nou notat vine testul lui, la 4–8 carduri", async ({ page }) => {
    test.setTimeout(180_000);
    await startFeed(page);
    await scrollToType(page, "newWord", 60);
    const card = active(page);
    const key = (await card.getAttribute("data-feed-key"))!;
    const wordId = key.split(":")[2]!; // new:vocab:<id>:it-ro:<poziție>
    await card.getByRole("button", { name: "Arată răspunsul" }).click();
    await card.getByRole("button", { name: /^Da/ }).click();
    await expect.poll(async () => (await page.locator("[data-feed-card]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.feedKey))).some((k) => k?.startsWith("grid:follow:"))).toBe(true);
    const keys = await page.locator("[data-feed-card]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.feedKey));
    const at = keys.indexOf(key);
    const follow = keys.findIndex((k) => k?.startsWith("grid:follow:"));
    expect(keys[follow]).toContain(wordId);
    expect(follow - at).toBeGreaterThanOrEqual(4);
    expect(follow - at).toBeLessThanOrEqual(8 + 2);
  });

  test("combo: apare după 3 răspunsuri corecte și dispare la o greșeală", async ({ page }) => {
    test.setTimeout(180_000);
    await startFeed(page);
    for (let i = 0; i < 3; i++) await nextTest(page, true);
    await expect(page.getByText("🔥 x3")).toBeVisible();
    await nextTest(page, false);
    await expect(page.getByText(/🔥 x/)).toHaveCount(0);
  });

  test("cu sunetul la răspunsuri oprit nu se creează niciun context audio", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __ctx: number; AudioContext: unknown };
      w.__ctx = 0;
      const Original = window.AudioContext;
      w.AudioContext = function (...args: ConstructorParameters<typeof AudioContext>) {
        w.__ctx++;
        return new Original(...args);
      };
    });
    await page.goto("/settings");
    await page.getByLabel("Sunet la răspunsuri").click();
    await expect(page.getByLabel("Sunet la răspunsuri")).not.toBeChecked();
    await startFeed(page);
    await nextTest(page, true);
    expect(await page.evaluate(() => (window as unknown as { __ctx: number }).__ctx)).toBe(0);
  });

  test("bilanț după 25 de carduri", async ({ page }) => {
    test.setTimeout(120_000);
    await startFeed(page);
    await scrollDown(page, 24); // al 25-lea card e activ
    await scrollDown(page, 1);
    await expect(active(page)).toHaveAttribute("data-feed-type", "milestone");
    await expect(active(page).getByText("25 de carduri!")).toBeVisible();
  });

  test("repetiții gata: cardul apare o singură dată pe zi", async ({ page }) => {
    test.setTimeout(180_000);
    /** Notează „Da” la următoarea repetiție din flux. */
    const rateNextReview = async () => {
      await scrollToType(page, "review", 40);
      const card = active(page);
      await card.getByRole("button", { name: "Arată răspunsul" }).click();
      await card.getByRole("button", { name: /^Da/ }).click();
      await expect(card.getByRole("button", { name: /^Da/ })).toHaveCount(0);
      await scrollDown(page, 1);
    };
    await seedLearnedWords(page, A1_IDS.slice(0, 2), -1);
    await startFeed(page);
    await rateNextReview();
    await rateNextReview();
    await expect.poll(() => cardTypes(page)).toContain("reviewsDone");
    await scrollToType(page, "reviewsDone", 3);
    await expect(active(page).getByText("Ai terminat repetițiile de azi!")).toBeVisible();

    // altă repetiție scadentă, terminată în a doua vizită din aceeași zi: fără card nou
    await seedLearnedWords(page, A1_IDS.slice(2, 3), -1);
    await startFeed(page);
    await rateNextReview();
    await scrollDown(page, 3);
    expect(await cardTypes(page)).not.toContain("reviewsDone");
  });

  test("✕ te duce pe Acasă când fluxul s-a deschis direct", async ({ page }) => {
    await page.goto("/feed");
    await page.getByRole("link", { name: "Închide fluxul" }).click();
    await expect(page.getByRole("heading", { name: "Impara l'italiano con Lupino" })).toBeVisible();
  });

  test("accesibilitate: cardul de start și un card pasiv", async ({ page }) => {
    const audit = async (label: string) => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, `${label}: probleme de accesibilitate`).toEqual([]);
    };
    await page.goto("/feed");
    await expect(startButton(page)).toBeVisible();
    await audit("start");
    await startButton(page).click();
    await expect.poll(() => active(page).getAttribute("data-feed-type")).not.toBe("start");
    await audit("card pasiv");
  });
});

test.describe("Flux: final de material", () => {
  // fără service worker, ca fișierele de date să treacă prin page.route
  test.use({ serviceWorkers: "block" });

  test("când nu mai e nimic nou apare cardul de final, apoi fluxul continuă", async ({ page }) => {
    test.setTimeout(120_000);
    await mockSpeech(page);
    // surse minuscule: o singură temă cu două reguli (fără exerciții), restul gol; fără cuvinte începute sau noi
    const grammar = JSON.parse(readFileSync("src/data/generated/grammar.json", "utf8")) as { level: string; rules: unknown[] }[];
    const topic = grammar.find((g) => g.level === "A1" && g.rules.length >= 2)!;
    const tiny: Record<string, unknown[]> = {
      grammar: [{ ...topic, rules: topic.rules.slice(0, 2), items: [] }],
      sentences: [],
      dialogues: [],
      stories: [],
      feed: [],
      details: [],
    };
    await page.route(/\/assets\/(grammar|sentences|dialogues|stories|feed|details)-[^/]+\.js$/, async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      // același nume îl poartă și module de cod (ex. hook-ul propozițiilor): doar fișierele de date se înlocuiesc
      if (!body.startsWith("var e=JSON.parse")) return route.fulfill({ response });
      const name = /\/assets\/([a-z]+)-/.exec(route.request().url())![1]!;
      await route.fulfill({ status: 200, contentType: "application/javascript", body: `export default ${JSON.stringify(tiny[name])};` });
    });
    await page.goto("/settings");
    await page.getByLabel("Cuvinte noi pe zi").selectOption("0");
    await expect(page.getByLabel("Cuvinte noi pe zi")).toHaveValue("0");

    await startFeed(page);
    await scrollToType(page, "endOfMaterial", 40);
    await expect(active(page).getByText("Ai văzut tot ce e nou azi")).toBeVisible();
    await scrollDown(page, 1);
    expect(await active(page).getAttribute("data-feed-type")).toBe("rule");
    // la al doilea final, tot un singur card de final, nu mai multe la rând
    await scrollToType(page, "endOfMaterial", 10);
    await scrollDown(page, 1);
    expect(await active(page).getAttribute("data-feed-type")).toBe("rule");
  });
});
