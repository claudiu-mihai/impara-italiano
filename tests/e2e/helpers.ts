import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { decodeWords, type CompactWords } from "../../src/domain/content/wordsCodec.ts";

export interface WordData {
  id: string;
  it: string;
  ro: string;
  pos: string;
  rank: number;
  level: string;
}

/** Cuvintele aplicației, în ordinea rangului (aceleași date generate de `npm run build:data`). */
export const WORDS: WordData[] = decodeWords(JSON.parse(readFileSync("src/data/generated/words.json", "utf8")) as CompactWords);

/** Scrie direct în IndexedDB carduri de vocabular aflate în faza de repetare (cuvinte „învățate”). */
export async function seedLearnedWords(page: Page, wordIds: string[], dueInDays = 5) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await page.evaluate(async ({ ids, dueInDays }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cards", "readwrite");
      for (const id of ids) {
        tx.objectStore("cards").put({
          cardId: `vocab:${id}:it-ro`,
          wordId: id,
          kind: "vocab",
          variant: "it-ro",
          introducedOn: "2026-01-01",
          due: new Date(Date.now() + dueInDays * 86_400_000),
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
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { ids: wordIds, dueInDays });
}

/** Scrie direct în IndexedDB carduri de conjugare (verb × timp) aflate în faza de repetare. */
export async function seedConjCards(
  page: Page,
  cards: { verbId: string; tense: string; stability: number; dueInDays?: number }[],
) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" }).or(page.getByText(/Ai terminat pentru azi/))).toBeVisible();
  await page.evaluate(async (list) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("impara-italiano");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("cards", "readwrite");
      for (const c of list) {
        tx.objectStore("cards").put({
          cardId: `conj:${c.verbId}:${c.tense}`,
          wordId: c.verbId,
          kind: "conj",
          variant: c.tense,
          introducedOn: "2026-01-01",
          due: new Date(Date.now() + (c.dueInDays ?? 5) * 86_400_000),
          stability: c.stability,
          difficulty: 5,
          elapsed_days: 0,
          scheduled_days: 5,
          learning_steps: 0,
          reps: 3,
          lapses: 0,
          state: 2,
          last_review: new Date(),
        });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, cards);
}

/** Scrie direct în IndexedDB un card de abilitate (ex. `skill:dialogue:la-bar-01`), în faza de repetare. */
export async function seedSkillCard(page: Page, cardId: string, wordId: string, { dueInDays = 5, stability = 5 } = {}) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" }).or(page.getByText(/Ai terminat pentru azi/))).toBeVisible();
  await page.evaluate(
    async ({ cardId, wordId, dueInDays, stability }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("impara-italiano");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("cards", "readwrite");
        tx.objectStore("cards").put({
          cardId,
          wordId,
          kind: "skill",
          variant: "auto",
          introducedOn: "2026-01-01",
          due: new Date(Date.now() + dueInDays * 86_400_000),
          stability,
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
    },
    { cardId, wordId, dueInDays, stability },
  );
}

const LUCA = { name: "Luca (Enhanced)", lang: "it-IT", localService: true, voiceURI: "mac:luca" };

/** Înlocuiește Web Speech API cu o variantă care înregistrează ce s-ar fi redat (cu o voce italiană locală). */
export async function mockSpeech(page: Page) {
  await page.addInitScript((voices) => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class Utterance {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        speak: (u: Utterance) => spoken.push(u.text),
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    // fișierele audio pregenerate nu se pot reda: replicile cad pe vocea de sistem (rezerva); `mockAudio` le înregistrează
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("blocat în test", "NotAllowedError"));
  }, [LUCA]);
}

/** Fișierele audio redate (căile, ex. /audio/dialogues/….mp3) se înregistrează în loc să se audă; se cheamă după `mockSpeech`. */
export async function mockAudio(page: Page) {
  await page.addInitScript(() => {
    const played: string[] = [];
    (window as unknown as { __played: string[] }).__played = played;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      played.push(new URL(this.src).pathname);
      return Promise.resolve();
    };
  });
}

/** Fișierele audio redate până acum, în ordine (cere `mockAudio`). */
export const played = (page: Page) => page.evaluate(() => (window as unknown as { __played: string[] }).__played);

/** Frazele redate până acum, în ordine (cere `mockSpeech`). */
export const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

/** Pornește sau oprește „Ascultă întâi” din Setări (testele pentru varianta cu text îl opresc). */
export async function setListenFirst(page: Page, on: boolean) {
  await page.goto("/settings");
  const box = page.getByLabel("Ascultă întâi");
  await expect(box).toBeVisible();
  if ((await box.isChecked()) === on) return;
  await box.click();
  if (on) await expect(box).toBeChecked();
  else await expect(box).not.toBeChecked();
}

/** Alege butoanele de evaluare din Setări: „simple” (Nu / Da, implicit la instalări noi) sau „full” (cu Greu și Ușor). */
export async function setRatingMode(page: Page, mode: "simple" | "full") {
  await page.goto("/settings");
  const select = page.getByLabel("Butoane de evaluare");
  await expect(select).toBeVisible();
  await select.selectOption(mode);
  await expect(select).toHaveValue(mode);
}

/** Alege ordinea cuvintelor noi din Setări (testele de mecanică a cardului pornesc de la „După frecvență”: primul cuvânt e *essere*). */
export async function setWordOrder(page: Page, order: "guided" | "frequency") {
  await page.goto("/settings");
  const select = page.getByLabel("Ordinea cuvintelor noi");
  await expect(select).toBeVisible();
  await select.selectOption(order);
  await expect(select).toHaveValue(order);
}
