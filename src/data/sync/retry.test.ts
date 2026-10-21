import { expect, test } from "vitest";
import { withRetry } from "./retry.ts";

const busy = new Error("429");
const isBusy = (e: unknown) => e === busy;

test("reîncearcă după erorile care o merită și întoarce rezultatul", async () => {
  let calls = 0;
  const pauses: number[] = [];
  const result = await withRetry(
    async () => {
      if (++calls < 3) throw busy;
      return "gata";
    },
    isBusy,
    [10, 20, 40],
    async (ms) => void pauses.push(ms),
  );
  expect(result).toBe("gata");
  expect(calls).toBe(3);
  expect(pauses).toEqual([10, 20]);
});

test("aruncă eroarea după ultima încercare", async () => {
  let calls = 0;
  await expect(
    withRetry(async () => { calls++; throw busy; }, isBusy, [1, 1], async () => {}),
  ).rejects.toBe(busy);
  expect(calls).toBe(3); // încercarea inițială + 2 reîncercări
});

test("alte erori nu se reîncearcă", async () => {
  let calls = 0;
  await expect(withRetry(async () => { calls++; throw new Error("altceva"); }, isBusy, [1, 1], async () => {})).rejects.toThrow("altceva");
  expect(calls).toBe(1);
});
