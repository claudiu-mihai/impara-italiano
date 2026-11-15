import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { mockSpeech, seedSkillCard, setListenFirst, spoken } from "./helpers.ts";

interface Line {
  speaker: string;
  it: string;
  ro: string;
}
interface DialogueData {
  id: string;
  topicId: string;
  level: string;
  you: string;
  lines: Line[];
  canDo: { ro: string };
}

const DIALOGUES: DialogueData[] = JSON.parse(readFileSync("src/data/generated/dialogues.json", "utf8"));
const BAR = DIALOGUES.find((d) => d.id === "la-bar-01")!;
const BAR_URL = "/learn/topics/la-bar/dialogue/la-bar-01";
const BAR_CARD = ["skill:dialogue:la-bar-01", "dialogue:la-bar-01"] as const;

/** Parcurge jocul de rol până la final: „Continuă” la replicile celuilalt, „Arată replica” + „Continuă” la ale tale. */
async function playRole(page: Page) {
  for (const line of BAR.lines) {
    if (line.speaker === BAR.you) {
      await expect(page.getByTestId("say-line")).toContainText(line.ro);
      await page.getByRole("button", { name: "Arată replica" }).click();
    }
    await page.getByRole("button", { name: "Continuă" }).click();
  }
}

test("pagina temei „La bar” are dialogul, cu obiectivul și cum intră în repetiție", async ({ page }) => {
  await page.goto("/learn/topics/la-bar");
  await page.getByRole("link", { name: "Dialog: Un caffè, per favore" }).click();
  await expect(page.getByTestId("canDo")).toContainText("Pot să comand la bar");
  await expect(page.getByTestId("dialogue-review")).toHaveText("Termină jocul de rol ca dialogul să intre în repetiție.");
});

test("Ascultă, cu „Ascultă întâi”: replica se aude, textul apare abia la cerere", async ({ page }) => {
  await mockSpeech(page);
  await page.goto(BAR_URL);
  await page.getByRole("button", { name: "Ascultă" }).click();

  const first = BAR.lines[0]!;
  await expect.poll(() => spoken(page)).toContain(first.it);
  await expect(page.getByText(first.it)).toHaveCount(0);
  await page.getByRole("button", { name: "Arată textul" }).click();
  await expect(page.getByText(first.it)).toBeVisible();
  await expect(page.getByText(first.ro)).toBeVisible();

  // ambele personaje se aud, și cu o singură voce italiană
  await page.getByRole("button", { name: "Următoarea replică" }).click();
  await expect.poll(() => spoken(page)).toContain(BAR.lines[1]!.it);
  await expect(page.getByTestId("dialogue-line")).toHaveCount(2);
  // replica de dinainte rămâne vizibilă
  await expect(page.getByText(first.it)).toBeVisible();
});

test("Ascultă, fără „Ascultă întâi”: textul se vede direct; la final duce la jocul de rol", async ({ page }) => {
  await mockSpeech(page);
  await setListenFirst(page, false);
  await page.goto(BAR_URL);
  await page.getByRole("button", { name: "Ascultă" }).click();
  await expect(page.getByText(BAR.lines[0]!.it)).toBeVisible();
  for (let i = 1; i < BAR.lines.length; i++) await page.getByRole("button", { name: "Următoarea replică" }).click();
  await page.getByRole("button", { name: "Treci la jocul de rol" }).click();
  await expect(page.getByRole("button", { name: "Continuă" })).toBeVisible();
});

test("Joc de rol: replica ta e ascunsă până o spui; nota „Bine” programează dialogul, „Încă o dată” nu mai notează", async ({ page }) => {
  await mockSpeech(page);
  await page.goto(BAR_URL);
  await page.getByRole("button", { name: "Joc de rol" }).click();

  const mine = BAR.lines.find((l) => l.speaker === BAR.you)!;
  await page.getByRole("button", { name: "Continuă" }).click();
  await expect(page.getByTestId("say-line")).toContainText(mine.ro);
  await expect(page.getByText(mine.it)).toHaveCount(0);
  await page.getByRole("button", { name: "Arată replica" }).click();
  await expect(page.getByText(mine.it)).toBeVisible();
  await expect.poll(() => spoken(page)).toContain(mine.it);
  await page.getByRole("button", { name: "Continuă" }).click();

  for (const line of BAR.lines.slice(2)) {
    if (line.speaker === BAR.you) await page.getByRole("button", { name: "Arată replica" }).click();
    await page.getByRole("button", { name: "Continuă" }).click();
  }
  const grades = page.getByRole("group", { name: "Cum ți-a ieșit?" });
  await expect(grades.getByRole("button")).toHaveCount(3);
  await grades.getByRole("button", { name: /^Bine/ }).click();
  await expect(page.getByTestId("dialogue-result")).toHaveText("Repetiția a fost notată; dialogul revine la timpul potrivit.");

  await page.getByRole("button", { name: "Încă o dată" }).click();
  await playRole(page);
  await expect(page.getByRole("group", { name: "Cum ți-a ieșit?" })).toHaveCount(0);
  await expect(page.getByTestId("dialogue-result")).toHaveText(/Antrenament liber/);

  await page.getByRole("link", { name: "Înapoi la temă" }).click();
  await page.getByRole("link", { name: "Dialog: Un caffè, per favore" }).click();
  await expect(page.getByTestId("dialogue-review")).toHaveText(/Următoarea repetiție: peste/);
});

test("un dialog programat mai târziu e exersare liberă: fără notare", async ({ page }) => {
  await seedSkillCard(page, ...BAR_CARD, { dueInDays: 5 });
  await page.goto(`${BAR_URL}?mode=roleplay`);
  await playRole(page);
  await expect(page.getByRole("group", { name: "Cum ți-a ieșit?" })).toHaveCount(0);
  await expect(page.getByTestId("dialogue-result")).toHaveText(/Antrenament liber/);
});

test("un dialog scadent apare pe Acasă și se deschide direct în jocul de rol", async ({ page }) => {
  await seedSkillCard(page, ...BAR_CARD, { dueInDays: -1 });
  await page.goto("/");
  const section = page.getByRole("region", { name: "Dialoguri de repetat" });
  await section.getByRole("link", { name: "Un caffè, per favore" }).click();
  await expect(page.getByTestId("say-line").or(page.getByRole("button", { name: "Continuă" }))).toBeVisible();
  await expect(page).toHaveURL(/mode=roleplay/);
});

test("reperele „pot să…”: bifat la un dialog învățat, nebifat altfel; doar nivelul curent", async ({ page }) => {
  await seedSkillCard(page, ...BAR_CARD, { stability: 10 });
  await seedSkillCard(page, "skill:dialogue:ora-01", "dialogue:ora-01", { stability: 3 });
  await page.goto("/");
  const items = page.getByTestId("can-do");
  const a1 = DIALOGUES.filter((d) => d.level === "A1");
  await expect(items).toHaveCount(a1.length);
  await expect(page.getByText(`1 din ${a1.length}`)).toBeVisible();
  await expect(items.filter({ hasText: "Pot să comand la bar" })).toHaveAttribute("data-learned", "true");
  await expect(items.filter({ hasText: DIALOGUES.find((d) => d.id === "ora-01")!.canDo.ro })).toHaveAttribute("data-learned", "false");
});

test("o instalare nouă nu arată reperele pe Acasă", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await expect(page.getByTestId("can-do")).toHaveCount(0);
});

test("un dialog care nu există: mesaj și drum înapoi la temă", async ({ page }) => {
  await page.goto("/learn/topics/la-bar/dialogue/la-bar-99");
  await expect(page.getByText("Dialogul nu există")).toBeVisible();
  await page.getByRole("link", { name: "Înapoi la temă" }).click();
  await expect(page).toHaveURL(/\/learn\/topics\/la-bar$/);
});

test("Învață → Dialoguri: lista pe niveluri duce la dialog", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("link", { name: /Dialoguri/ }).click();
  await expect(page.getByRole("heading", { name: "Dialoguri", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Un caffè, per favore/ })).toBeVisible();
  await page.getByRole("link", { name: /In albergo/ }).click();
  await expect(page.getByTestId("canDo")).toContainText("Pot să fac check-in la hotel");
});
