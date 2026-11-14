import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { seedLearnedWords, setWordOrder, WORDS, type WordData } from "./helpers.ts";

interface GuideTopic {
  id: string;
  path?: number;
  wordIds: string[];
}
// Aceleași date ca în aplicație (generate de `npm run build:data`)
const GUIDE: GuideTopic[] = JSON.parse(readFileSync("src/data/generated/guide.json", "utf8"));
const byId = (id: string) => WORDS.find((w) => w.id === id)! as WordData & { article?: string };
const italian = (w: WordData & { article?: string }) =>
  w.pos === "noun" && w.article ? (w.article.endsWith("'") ? `${w.article}${w.it}` : `${w.article} ${w.it}`) : w.it;
const onPath = GUIDE.filter((t) => t.path !== undefined).sort((a, b) => a.path! - b.path!);

const front = (page: Page) => page.getByTestId("card-front");

/** Textul italian al cardurilor noi, pe rând, notându-le „Ușor” ca să avansăm. */
async function firstNewCards(page: Page, count: number): Promise<string[]> {
  await page.goto("/learn/vocab");
  const texts: string[] = [];
  for (let i = 0; i < count; i++) {
    await expect(front(page)).toBeVisible();
    await expect(page.getByText("Cuvânt nou")).toBeVisible();
    texts.push((await front(page).locator("span[lang=it]").first().textContent())!);
    await page.getByRole("button", { name: "Arată răspunsul" }).click();
    await page.getByRole("button", { name: /^Ușor/ }).click();
    await expect(page.getByText(new RegExp(`^${i + 2} / \\d+$`))).toBeVisible();
  }
  return texts;
}

test("instalare nouă: întâi cuvintele căii (saluturi), cu un cuvânt frecvent la fiecare două", async ({ page }) => {
  const [a, b] = onPath[0]!.wordIds;
  const texts = await firstNewCards(page, 3);
  expect(texts[0]).toBe(italian(byId(a!)));
  expect(texts[1]).toBe(italian(byId(b!)));
  // al treilea e cel mai frecvent cuvânt, ca verbele de bază să nu lipsească
  expect(texts[2]).toBe("essere");
});

test("cu „După frecvență”, ordinea rămâne cea veche", async ({ page }) => {
  await setWordOrder(page, "frequency");
  expect((await firstNewCards(page, 1))[0]).toBe("essere");
});

test("tema începută trece înaintea căii: ce a rămas din La bar vine primul", async ({ page }) => {
  const bar = GUIDE.find((t) => t.id === "la-bar")!;
  const known = bar.wordIds.slice(0, 7); // 7 din 23: peste un sfert
  await seedLearnedWords(page, known);
  const next = byId(bar.wordIds[7]!);
  const texts = await firstNewCards(page, 2);
  expect(texts[0]).toBe(italian(next));
  expect(bar.wordIds.map((id) => italian(byId(id)))).toContain(texts[1]);
});

test("setarea „Ordinea cuvintelor noi” e ghidată implicit", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByLabel("Ordinea cuvintelor noi")).toHaveValue("guided");
});
