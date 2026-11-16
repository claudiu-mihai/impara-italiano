import { ClientResponseError } from "pocketbase";
import { expect, test } from "vitest";
import { isRateLimited } from "./pocketbaseRemote.ts";

const serverError = (status: number, data: unknown) =>
  new ClientResponseError({ url: "/api/batch", status, response: { status, message: "", data } });

test("429 direct: serverul cere o pauză", () => {
  expect(isRateLimited(serverError(429, {}))).toBe(true);
});

test("lotul refuzat pentru că o cerere din el a lovit limita (400 cu 429 înăuntru) se reîncearcă", () => {
  const error = serverError(400, {
    requests: {
      "20": { code: "batch_request_failed", response: { status: 429, message: "Too Many Requests.", data: {} } },
    },
  });
  expect(isRateLimited(error)).toBe(true);
});

test("lotul refuzat din alt motiv (date invalide) nu se reîncearcă", () => {
  const error = serverError(400, {
    requests: {
      "0": { code: "batch_request_failed", response: { status: 400, data: { updatedAt: { code: "validation_required" } } } },
    },
  });
  expect(isRateLimited(error)).toBe(false);
  expect(isRateLimited(serverError(400, {}))).toBe(false);
  expect(isRateLimited(new Error("altceva"))).toBe(false);
});
