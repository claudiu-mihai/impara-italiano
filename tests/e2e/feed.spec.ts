import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockAudio, mockSpeech, played, seedLearnedWords, spoken, WORDS } from "./helpers.ts";

// cardurile pe care ecranul le știe afișa; se completează odată cu fiecare etapă a fluxului
const PASSIVE = ["knownWord", "sentence", "rule", "lines", "didYouKnow", "pack"];

const active = (page: Page) => page.locator('[data-feed-card][data-active="true"]');
const startButton = (page: Page) => page.getByRole("button", { name: "Atinge ca să începi" });
/** Frazele rostite, fără fraza goală cu care se deblochează redarea. */
const said = async (page: Page) => (await spoken(page)).filter(Boolean);

async function startFeed(page: Page) {
  await page.goto("/feed");
  await startButton(page).click();
  await expect.poll(() => active(page).getAttribute("data-feed-type")).not.toBe("start");
}

/** Derulează `n` carduri cu tastatura, așteptând de fiecare dată să se schimbe cardul activ. */
async function scrollDown(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const key = await active(page).getAttribute("data-feed-key");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => active(page).getAttribute("data-feed-key")).not.toBe(key);
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
    // rapid: încă o derulare imediat, fără să așteptăm redarea
    await scrollDown(page, 1);
    await expect.poll(async () => {
      const last = (await said(page)).at(-1) ?? "";
      const text = (await active(page).textContent()) ?? "";
      return text.includes(last) && last !== "";
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
