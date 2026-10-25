import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { numberToItalian } from "../../src/domain/skills/numbers.ts";
import { formatDigital, timePhrase } from "../../src/domain/skills/time.ts";
import { WORDS, type WordData } from "./helpers.ts";

interface TopicData {
  id: string;
  title: { it: string; ro: string };
  rules: { it: string; ro: string }[];
  subgroups: { title: { it: string; ro: string }; wordIds: string[] }[];
  exercises: string[];
  sequence?: string[];
  skill?: string;
}
const TOPICS: TopicData[] = JSON.parse(readFileSync("src/data/generated/topics.json", "utf8"));
const topic = (id: string) => TOPICS.find((t) => t.id === id)!;
const byId = (id: string) => WORDS.find((w) => w.id === id)! as WordData & { article?: string };
const wordIdsOf = (t: TopicData) => [...new Set(t.subgroups.flatMap((s) => s.wordIds))];
const italian = (w: WordData & { article?: string }) =>
  w.pos === "noun" && w.article ? (w.article.endsWith("'") ? `${w.article}${w.it}` : `${w.article} ${w.it}`) : w.it;

async function cardCount(page: Page, prefix: string): Promise<number> {
  return page.evaluate(async (p) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = db.transaction("cards").objectStore("cards").getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return keys.filter((k) => String(k).startsWith(p)).length;
  }, prefix);
}

test("există 42 de teme (14 ★ și 28 din etapa a doua) și fiecare cuvânt al lor există", () => {
  expect(TOPICS).toHaveLength(42);
  expect(TOPICS.filter((t) => (t as TopicData & { first: boolean }).first)).toHaveLength(14);
  for (const t of TOPICS) for (const id of wordIdsOf(t)) expect(byId(id), `${t.id}: ${id}`).toBeDefined();
});

test("Învață → Teme: lista pe grupuri și fișa temei", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("link", { name: /Teme/ }).click();
  await expect(page.getByRole("heading", { name: "Teme", level: 1 })).toBeVisible();
  for (const group of ["Timp", "Numere", "Spațiu", "Oameni", "Zi de zi", "Oraș și călătorii", "Conversație"]) {
    await expect(page.getByRole("heading", { name: group, level: 2 })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Zilele săptămânii/ })).toBeVisible();

  await page.getByRole("link", { name: /Zilele săptămânii/ }).click();
  await expect(page.getByRole("heading", { name: "Zilele săptămânii", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Da ricordare" })).toBeVisible();
  await expect(page.getByText(/il lunedì/).first()).toBeVisible();
  await expect(page.getByTestId("topic-progress")).toContainText(`0 din ${wordIdsOf(topic("zilele-saptamanii")).length} cuvinte începute`);
  // bara de jos rămâne vizibilă pe fișă
  await expect(page.getByRole("navigation", { name: "Navigare principală" })).toBeVisible();
});

test("pagina cuvântului trimite la temă", async ({ page }) => {
  await page.goto("/browse/n-lunedì");
  await page.getByRole("link", { name: /Vezi tema.*Zilele săptămânii/ }).click();
  await expect(page.getByRole("heading", { name: "Zilele săptămânii", level: 1 })).toBeVisible();
});

test("Studiază tema: doar cuvintele temei, progres comun cu restul aplicației", async ({ page }) => {
  const t = topic("zilele-saptamanii");
  const allowed = new Set(wordIdsOf(t).map((id) => italian(byId(id))));

  await page.goto(`/learn/topics/${t.id}`);
  await page.getByRole("link", { name: "Studiază", exact: true }).click();
  await expect(page.getByTestId("card-front")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigare principală" })).toHaveCount(0);

  const front = (await page.getByTestId("card-front").locator("span.text-4xl").textContent())!;
  expect(allowed.has(front), `„${front}” nu e din temă`).toBe(true);

  // notez un cuvânt și verific progresul pe fișa temei
  await page.getByRole("button", { name: "Arată răspunsul" }).click();
  await page.getByRole("button", { name: /^Bine/ }).click();
  await page.getByRole("link", { name: "Ieși din sesiune" }).click();
  await expect(page.getByRole("heading", { name: "Zilele săptămânii", level: 1 })).toBeVisible();
  await expect(page.getByTestId("topic-progress")).toContainText("1 din");
});

test("Quiz pe temă: întrebări din cuvintele temei; primul răspuns creează cardul", async ({ page }) => {
  const t = topic("culori");
  const allowedRo = new Set(wordIdsOf(t).map((id) => byId(id).it));
  await page.goto(`/learn/topics/${t.id}/quiz`);
  await expect(page.getByRole("group", { name: "Variante de răspuns" })).toBeVisible();
  const prompt = await page.locator("p.text-4xl").first().textContent();
  expect(allowedRo.has(prompt!.replace(/^(il|lo|la|l'|i|gli|le) ?/, "")), `„${prompt}” nu e din temă`).toBe(true);
  await page.getByRole("group", { name: "Variante de răspuns" }).getByRole("button").first().click();
  await expect(page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ })).toBeVisible();
  await expect.poll(() => cardCount(page, "vocab:")).toBe(1);
});

test("Potrivește perechi: o rundă completă", async ({ page }) => {
  const t = topic("culori");
  const roOf = new Map(wordIdsOf(t).map((id) => [italian(byId(id)), byId(id).ro]));
  await page.goto(`/learn/topics/${t.id}/match`);
  const left = page.getByRole("group", { name: "Italiană" });
  const right = page.getByRole("group", { name: "Română" });
  await expect(left.getByRole("button")).toHaveCount(5);

  const labels = await left.getByRole("button").allTextContents();
  for (const label of labels) {
    await left.getByRole("button", { name: label, exact: true }).click();
    await right.getByRole("button", { name: roOf.get(label)!, exact: true }).click();
  }
  await expect(page.getByRole("button", { name: /Runda următoare|Încă o dată/ }).or(page.getByText("Ai potrivit toate perechile"))).toBeVisible();
});

test("Potrivește perechi: o pereche greșită nu se păstrează", async ({ page }) => {
  const t = topic("culori");
  await page.goto(`/learn/topics/${t.id}/match`);
  const left = page.getByRole("group", { name: "Italiană" });
  const right = page.getByRole("group", { name: "Română" });
  const first = left.getByRole("button").first();
  const firstLabel = (await first.textContent())!;
  const correctRo = wordIdsOf(t).map(byId).find((w) => italian(w) === firstLabel)!.ro;
  const wrongRight = right.getByRole("button").filter({ hasNotText: correctRo }).first();
  await first.click();
  await wrongRight.click();
  await expect(first).not.toHaveAttribute("aria-pressed", "true", { timeout: 3000 });
  await expect(first).toBeEnabled();
});

test("Ordonează: zilele în ordine, apoi întrebări «Ce urmează după…»", async ({ page }) => {
  const t = topic("zilele-saptamanii");
  await page.goto(`/learn/topics/${t.id}/order`);
  await expect(page.getByRole("heading", { name: "Pune elementele în ordine" })).toBeVisible();

  // un element greșit nu se așază
  const group = page.getByRole("group", { name: "Elemente de ordonat" });
  await group.getByRole("button", { name: italian(byId(t.sequence![3]!)) }).click();
  await expect(page.getByText("Alege primul element…")).toBeVisible();

  for (const id of t.sequence!) await group.getByRole("button", { name: italian(byId(id)), exact: true }).click();
  await expect(page.getByTestId("follow-prompt")).toBeVisible();
  await expect(page.getByText(/^(Ce urmează după|Ce era înainte de)$/)).toBeVisible();
});

test("Numere 0–20: o rundă notată și cardul abilității creat", async ({ page }) => {
  // numărul rostit (TTS) nu se poate citi din pagină, deci se prinde ce primește speechSynthesis
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    const original = window.speechSynthesis?.speak?.bind(window.speechSynthesis);
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        w.__spoken.push(utterance.text);
        original?.(utterance);
      };
    }
  });
  const reverse = new Map(Array.from({ length: 21 }, (_, n) => [numberToItalian(n), String(n)]));
  await page.goto("/learn/topics/numere-0-20/numbers");
  await expect(page.getByText("Repetiție")).toBeVisible();

  let listened = 0;
  for (let i = 0; i < 5; i++) {
    const digits = page.getByTestId("digits");
    const spoken = page.getByTestId("spoken-text");
    await expect(digits.or(spoken).or(page.getByRole("button", { name: /Ascultă pronunția|Audio necesită internet/ }))).toBeVisible();
    if (await digits.isVisible()) {
      await page.getByLabel("Răspunsul tău").fill(numberToItalian(Number(await digits.textContent())));
    } else if (await spoken.isVisible()) {
      // fără voce italiană numărul apare ca text
      await page.getByLabel("Răspunsul tău").fill(reverse.get((await spoken.textContent())!)!);
    } else {
      listened++;
      await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBeGreaterThanOrEqual(listened);
      const text = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
      await page.getByLabel("Răspunsul tău").fill(reverse.get(text)!);
    }
    await page.getByRole("button", { name: "Verifică" }).click();
    await expect(page.getByText("Corect!")).toBeVisible();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  await expect(page.getByText("5 din 5")).toBeVisible();
  await expect(page.getByText("Repetiția a fost notată")).toBeVisible();
  await expect.poll(() => cardCount(page, "skill:numbers-0-20")).toBe(1);

  // runda următoare este antrenament și nu schimbă programul
  await page.getByRole("button", { name: "Încă o rundă" }).click();
  await expect(page.getByText("Repetiție", { exact: true })).toHaveCount(0);
});

test("temele din etapa a doua au fișă, reguli și toate cuvintele cu rând", async ({ page }) => {
  for (const id of ["familia", "la-hotel", "expresii-colocviale"]) {
    const t = topic(id);
    await page.goto(`/learn/topics/${id}`);
    await expect(page.getByRole("heading", { name: t.title.ro, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Da ricordare" })).toBeVisible();
    // regulile sunt ascunse până atingi titlul
    await expect(page.getByText(t.rules[0]!.it, { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Da ricordare" }).click();
    for (const rule of t.rules) await expect(page.getByText(rule.it, { exact: true })).toBeVisible();
    expect(await page.getByRole("link", { name: /^(?!Studiază|Quiz|Potrivește|Ordonează|Înapoi).+/ }).count()).toBeGreaterThan(0);
  }
});

test("Numere 100–1.000.000: cifrele au punct la mii și se acceptă litere sau cifre", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    const original = window.speechSynthesis?.speak?.bind(window.speechSynthesis);
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        w.__spoken.push(utterance.text);
        original?.(utterance);
      };
    }
  });
  // numărul rostit se regăsește căutând în interval (101 – 1.000.000)
  const fromWords = (text: string) => {
    for (let n = 101; n <= 1_000_000; n++) if (numberToItalian(n) === text) return n;
    throw new Error(`număr necunoscut: ${text}`);
  };
  await page.goto("/learn/topics/numere-100-1000000/numbers");
  await expect(page.getByText("Repetiție")).toBeVisible();

  let listened = 0;
  for (let i = 0; i < 5; i++) {
    const digits = page.getByTestId("digits");
    const spoken = page.getByTestId("spoken-text");
    await expect(digits.or(spoken).or(page.getByRole("button", { name: /Ascultă pronunția|Audio necesită internet/ }))).toBeVisible();
    if (await digits.isVisible()) {
      const text = (await digits.textContent())!;
      expect(text).toMatch(/^\d{1,3}(\.\d{3})*$/);
      await page.getByLabel("Răspunsul tău").fill(numberToItalian(Number(text.replaceAll(".", ""))));
    } else if (await spoken.isVisible()) {
      await page.getByLabel("Răspunsul tău").fill(String(fromWords((await spoken.textContent())!)));
    } else {
      listened++;
      await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBeGreaterThanOrEqual(listened);
      const text = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
      // cu punct de mii: se acceptă și această scriere
      await page.getByLabel("Răspunsul tău").fill(fromWords(text).toLocaleString("de-DE"));
    }
    await page.getByRole("button", { name: "Verifică" }).click();
    await expect(page.getByText("Corect!")).toBeVisible();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  await expect(page.getByText("5 din 5")).toBeVisible();
});

test("Ceasul: citește ora de pe cadran și alege cadranul după ora scrisă", async ({ page }) => {
  const byPhrase = new Map<string, string>();
  for (let hour = 1; hour <= 12; hour++) {
    for (let minute = 0; minute < 60; minute += 5) byPhrase.set(timePhrase({ hour, minute }), formatDigital({ hour, minute }));
  }
  await page.goto("/learn/topics/ora/clock");
  await expect(page.getByText("Repetiție")).toBeVisible();

  for (let i = 0; i < 5; i++) {
    const phrase = page.getByTestId("phrase");
    const input = page.getByLabel("Răspunsul tău");
    await expect(phrase.or(input)).toBeVisible();
    if (await phrase.isVisible()) {
      const digital = byPhrase.get((await phrase.textContent())!)!;
      await page.getByRole("button", { name: `Ceasul ${digital}` }).click();
    } else {
      const label = (await page.getByRole("img", { name: /^Ceas: / }).first().getAttribute("aria-label"))!;
      const [hour, minute] = label.replace("Ceas: ", "").split(":").map(Number);
      await input.fill(timePhrase({ hour: hour!, minute: minute! }));
      await page.getByRole("button", { name: "Verifică" }).click();
    }
    await expect(page.getByText("Corect!")).toBeVisible();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  await expect(page.getByText("5 din 5")).toBeVisible();
  await expect.poll(() => cardCount(page, "skill:clock")).toBe(1);
});

test("Unde e Lupino?: 6 întrebări, jumătate cu variante, jumătate scrise", async ({ page }) => {
  await page.goto("/learn/topics/pozitia-obiectelor/cat");
  await expect(page.getByRole("heading", { name: "Unde e Lupino?" })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("group", { name: "Variante de răspuns" }).getByRole("button").first().click();
    await expect(page.getByTestId("cat-feedback")).toBeVisible();
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  for (let i = 0; i < 3; i++) {
    await page.getByLabel(/Scrie unde e Lupino/).fill("nicăieri");
    await page.getByRole("button", { name: "Verifică" }).click();
    await expect(page.getByTestId("cat-feedback")).toContainText("Nu chiar");
    await page.getByRole("button", { name: /^(Continuă|Vezi rezultatul)$/ }).click();
  }
  await expect(page.getByText(/^\d din 6$/)).toBeVisible();
});

test("ecranele de exerciții ascund bara de jos", async ({ page }) => {
  for (const path of ["match", "order", "cat"]) {
    await page.goto(`/learn/topics/${path === "cat" ? "pozitia-obiectelor" : "zilele-saptamanii"}/${path}`);
    await expect(page.getByRole("link", { name: "Ieși din sesiune" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigare principală" })).toHaveCount(0);
  }
});

test("Acasă: abilitățile scadente apar la „Abilități de repetat”", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Abilități de repetat" })).toHaveCount(0);

  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cards", "readwrite");
      tx.objectStore("cards").put({
        cardId: "skill:clock",
        wordId: "clock",
        kind: "skill",
        variant: "auto",
        introducedOn: "2026-01-01",
        due: new Date(Date.now() - 86_400_000),
        stability: 3,
        difficulty: 5,
        elapsed_days: 3,
        scheduled_days: 3,
        learning_steps: 0,
        reps: 2,
        lapses: 0,
        state: 2,
        last_review: new Date(Date.now() - 4 * 86_400_000),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Abilități de repetat" })).toBeVisible();
  await page.getByRole("link", { name: /L'ora/ }).click();
  await expect(page.getByText("Repetiție", { exact: true })).toBeVisible();
});
