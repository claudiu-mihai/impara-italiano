import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

interface GrammarTopic {
  id: string;
  order: number;
  title: string;
  items: { id: string; it: string; gap: string; ro: string }[];
}
const GRAMMAR: GrammarTopic[] = JSON.parse(readFileSync("src/data/generated/grammar.json", "utf8"));
const articoli = GRAMMAR.find((t) => t.id === "articoli")!;
const essere = GRAMMAR.find((t) => t.id === "essere")!;

test("Învață → Jocuri: temele în ordinea de învățare, apoi cele 3 jocuri", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("link", { name: /Jocuri/ }).click();
  await expect(page.getByRole("heading", { name: "Jocuri", level: 1 })).toBeVisible();

  const titles = await page.getByRole("list", { name: "Temele de gramatică" }).getByRole("link").allInnerTexts();
  expect(titles.slice(0, 3).map((t) => t.replace(/\s+/g, " "))).toEqual([
    expect.stringContaining("Articolul hotărât și nehotărât"),
    expect.stringContaining("Verbul „a fi”"),
    expect.stringContaining("Verbul „a avea”"),
  ]);

  await page.getByRole("link", { name: /Articolul hotărât/ }).click();
  await expect(page.getByRole("heading", { name: articoli.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "De reținut" })).toBeVisible();
  // implicit restrâns; se extinde la atingere
  const rules = page.getByRole("button", { name: "De reținut" });
  await expect(rules).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText(/Articolul hotărât arată ceva anume/)).toBeHidden();
  await rules.click();
  await expect(rules).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/Articolul hotărât arată ceva anume/)).toBeVisible();
  await rules.click();
  await expect(page.getByText(/Articolul hotărât arată ceva anume/)).toBeHidden();
  for (const game of ["Cartonașe", "Potrivire", "Introducere text"]) {
    await expect(page.getByRole("link", { name: new RegExp(game) })).toBeVisible();
  }
  // meniul păstrează bara de jos, jocurile o ascund
  await expect(page.getByRole("navigation", { name: "Navigare principală" })).toBeVisible();
  await page.getByRole("link", { name: /Cartonașe/ }).click();
  await expect(page.getByTestId("grammar-card")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigare principală" })).toHaveCount(0);
});

test("Cartonașe: răspunsul apare la întoarcere, „Mai exersez” readuce cartonașul", async ({ page }) => {
  await page.goto("/learn/games/articoli/cards");
  const card = page.getByTestId("grammar-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("grammar-answer")).toHaveCount(0);

  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  const answer = (await page.getByTestId("grammar-answer").locator("p").first().textContent())!;
  expect(articoli.items.map((i) => i.it)).toContain(answer);

  await page.getByRole("button", { name: "Mai exersez" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  // cartonașul lăsat pentru exersare a trecut la coada rândului: rămân tot 10 de parcurs
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: "Arată răspunsul" }).click();
    await page.getByRole("button", { name: "Am știut" }).click();
  }
  await expect(page.getByRole("heading", { name: "Ai terminat cartonașele" })).toBeVisible();
});

test("Potrivire: 2 runde de câte 5 perechi, o greșeală nu blochează jocul", async ({ page }) => {
  await page.goto("/learn/games/essere/match");
  await expect(page.getByRole("heading", { name: "Potrivește perechile" })).toBeVisible();

  for (let round = 0; round < 2; round++) {
    const left = page.getByRole("group", { name: "Italiană" }).getByRole("button");
    await expect(left).toHaveCount(5);
    const phrases = await left.allInnerTexts();

    // o pereche greșită: prima frază cu o traducere care nu îi aparține
    const first = essere.items.find((i) => i.it === phrases[0])!;
    const wrong = (await page.getByRole("group", { name: "Română" }).getByRole("button").allInnerTexts()).find((t) => t !== first.ro)!;
    await left.first().click();
    await page.getByRole("group", { name: "Română" }).getByRole("button", { name: wrong, exact: true }).click();
    await expect(left.first()).toBeEnabled();

    for (const phrase of phrases) {
      const entry = essere.items.find((i) => i.it === phrase)!;
      await page.getByRole("group", { name: "Italiană" }).getByRole("button", { name: phrase, exact: true }).click();
      await page.getByRole("group", { name: "Română" }).getByRole("button", { name: entry.ro, exact: true }).click();
    }
    // după ultima rundă jocul se încheie singur
    if (round === 0) await page.getByRole("button", { name: "Runda următoare" }).click();
  }
  await expect(page.getByRole("heading", { name: "Ai potrivit toate perechile" })).toBeVisible();
  await expect(page.getByText(/2 greșeli/)).toBeVisible();
});

test("Introducere text: răspunsul corect, cel greșit și „e” în loc de „è”", async ({ page }) => {
  await page.goto("/learn/games/essere/type");
  const prompt = page.getByTestId("grammar-prompt");
  const input = page.getByRole("textbox", { name: "Cuvântul care lipsește" });
  await expect(prompt).toBeVisible();

  let correct = 0;
  for (let step = 0; step < 10; step++) {
    // fraza afișată are lacuna goală: se identifică exemplul după traducere
    const ro = (await prompt.locator("xpath=following-sibling::p").textContent())!;
    const entry = essere.items.find((i) => i.ro === ro)!;

    if (step === 0) {
      // greșit în mod voit
      await input.fill("zzz");
      await page.getByRole("button", { name: "Verifică" }).click();
      await expect(page.getByText(`Răspuns corect: ${entry.gap}`)).toBeVisible();
    } else if (step === 1 && entry.gap === "è") {
      await input.fill("e");
      await page.getByRole("button", { name: "Verifică" }).click();
      await expect(page.getByText(/Aproape! Atenție la accent/)).toBeVisible();
    } else {
      await input.fill(entry.gap);
      await page.getByRole("button", { name: "Verifică" }).click();
      await expect(page.getByText("Corect!")).toBeVisible();
      correct++;
    }
    await page.getByRole("button", { name: /Continuă|Vezi rezultatul/ }).click();
  }
  await expect(page.getByRole("heading", { name: new RegExp(`^${correct} din 10$`) })).toBeVisible();
});
