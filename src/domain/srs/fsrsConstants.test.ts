import { Rating as FsrsRating, State as FsrsState } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { Rating, State } from "./fsrsConstants.ts";

describe("fsrsConstants", () => {
  it("are aceleași valori ca enum-urile din ts-fsrs", () => {
    for (const key of ["New", "Learning", "Review", "Relearning"] as const) expect(State[key]).toBe(FsrsState[key]);
    for (const key of ["Manual", "Again", "Hard", "Good", "Easy"] as const) expect(Rating[key]).toBe(FsrsRating[key]);
  });
});
