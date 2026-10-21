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
export async function seedLearnedWords(page: Page, wordIds: string[]) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Începe sesiunea" })).toBeVisible();
  await page.evaluate(async (ids) => {
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
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, wordIds);
}

/** Scrie direct în IndexedDB carduri de conjugare (verb × timp) aflate în faza de repetare. */
export async function seedConjCards(page: Page, cards: { verbId: string; tense: string; stability: number }[]) {
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
          due: new Date(Date.now() + 5 * 86_400_000),
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
