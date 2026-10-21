import { describe, expect, it } from "vitest";

import { newStoredCard } from "../srs/scheduler.ts";
import type { StoredCard } from "../srs/types.ts";
import { firstLoginChoice, mergeCard, mergeSettingsTimes } from "./merge.ts";
import { cardToData, logToData, newUid } from "./serialize.ts";

const base = newStoredCard({ cardId: "vocab:w1:it-ro", wordId: "w1", kind: "vocab", variant: "it-ro" }, new Date(2026, 9, 1), "2026-10-01");
const card = (updatedAt: number, reps = 1): StoredCard => ({ ...base, updatedAt, reps });

describe("mergeCard", () => {
  it("serverul mai nou înlocuiește cardul local", () => {
    const remote = card(2000, 5);
    expect(mergeCard({ card: card(1000) }, { updatedAt: 2000, deleted: false, card: remote })).toEqual({ action: "apply", card: remote });
  });

  it("local mai nou se păstrează și se retrimite", () => {
    expect(mergeCard({ card: card(3000) }, { updatedAt: 2000, deleted: false, card: card(2000) })).toEqual({ action: "keep-and-push" });
  });

  it("un card care nu există local se preia de pe server", () => {
    const remote = card(2000);
    expect(mergeCard({}, { updatedAt: 2000, deleted: false, card: remote })).toEqual({ action: "apply", card: remote });
  });

  it("o ștergere mai nouă de pe server elimină cardul local", () => {
    expect(mergeCard({ card: card(1000) }, { updatedAt: 2000, deleted: true })).toEqual({ action: "remove" });
  });

  it("un card reînvățat după ștergere bate ștergerea veche", () => {
    expect(mergeCard({ card: card(3000) }, { updatedAt: 2000, deleted: true })).toEqual({ action: "keep-and-push" });
  });

  it("o ștergere locală mai nouă nu se lasă înviată de un card vechi de pe server", () => {
    expect(mergeCard({ deletedAt: 3000 }, { updatedAt: 2000, deleted: false, card: card(2000) })).toEqual({ action: "keep-and-push" });
  });

  it("o ștergere de pe server pentru un card inexistent local nu face nimic rău", () => {
    expect(mergeCard({}, { updatedAt: 2000, deleted: true })).toEqual({ action: "remove" });
  });

  describe("la aceeași oră ambele dispozitive aleg la fel", () => {
    it("ștergerea bate cardul activ", () => {
      // dispozitivul A are cardul, B are ștergerea; fiecare vede versiunea celuilalt ca „remote”
      expect(mergeCard({ card: card(2000) }, { updatedAt: 2000, deleted: true })).toEqual({ action: "remove" });
      expect(mergeCard({ deletedAt: 2000 }, { updatedAt: 2000, deleted: false, card: card(2000) })).toEqual({ action: "keep-and-push" });
    });

    it("între două carduri active câștigă cel cu mai multe repetiții", () => {
      const more = card(2000, 7);
      expect(mergeCard({ card: card(2000, 3) }, { updatedAt: 2000, deleted: false, card: more })).toEqual({ action: "apply", card: more });
      expect(mergeCard({ card: more }, { updatedAt: 2000, deleted: false, card: card(2000, 3) })).toEqual({ action: "keep" });
    });

    it("aceeași versiune nu schimbă nimic", () => {
      expect(mergeCard({ card: card(2000) }, { updatedAt: 2000, deleted: false, card: card(2000) })).toEqual({ action: "keep" });
    });
  });
});

describe("mergeSettingsTimes", () => {
  it("fără setări locale câștigă serverul; altfel cea mai nouă", () => {
    expect(mergeSettingsTimes(undefined, 5)).toBe("apply");
    expect(mergeSettingsTimes(1, 5)).toBe("apply");
    expect(mergeSettingsTimes(9, 5)).toBe("keep-and-push");
    expect(mergeSettingsTimes(5, 5)).toBe("keep");
  });
});

describe("firstLoginChoice", () => {
  it("întreabă doar când există progres și local, și pe server", () => {
    expect(firstLoginChoice(true, true)).toBe("ask");
    expect(firstLoginChoice(true, false)).toBe("merge");
    expect(firstLoginChoice(false, true)).toBe("merge");
    expect(firstLoginChoice(false, false)).toBe("merge");
  });
});

describe("serializare", () => {
  it("cardul trimis pe server nu conține câmpul updatedAt, iar datele sunt JSON simplu", () => {
    const data = cardToData(card(2000));
    expect(data).not.toHaveProperty("updatedAt");
    expect(typeof data.due).toBe("string");
    expect(data.cardId).toBe("vocab:w1:it-ro");
  });

  it("jurnalul trimis pe server nu conține id-ul local și nici uid-ul", () => {
    const data = logToData({ id: 4, uid: "x", cardId: "c", rating: 3, reviewedAt: new Date(0), studyDay: "d", source: "quiz" } as never);
    expect(data).not.toHaveProperty("id");
    expect(data).not.toHaveProperty("uid");
    expect(data.reviewedAt).toBe("1970-01-01T00:00:00.000Z");
  });

  it("newUid produce identificatori diferiți", () => {
    expect(newUid()).not.toBe(newUid());
    expect(newUid()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
