import { expect, test } from "vitest";
import type { Dialogue } from "../content/schema.ts";
import { dialogueVoice } from "./voices.ts";

const withOther = (gender: "m" | "f"): Pick<Dialogue, "speakers" | "you"> => ({
  speakers: [
    { id: "altul", name: { it: "Altro", ro: "Altul" }, gender },
    { id: "tu", name: { it: "Tu", ro: "Tu" } },
  ],
  you: "tu",
});

test("celălalt personaj vorbește cu vocea genului lui", () => {
  expect(dialogueVoice(withOther("m"), "altul", "f")).toBe("francesco");
  expect(dialogueVoice(withOther("f"), "altul", "m")).toBe("giullia");
});

test("cursantul are vocea genului ales când e diferit de al celuilalt", () => {
  expect(dialogueVoice(withOther("f"), "tu", "m")).toBe("francesco");
  expect(dialogueVoice(withOther("m"), "tu", "f")).toBe("giullia");
});

test("la același gen, cursantul primește a doua voce, ca personajele să se deosebească", () => {
  expect(dialogueVoice(withOther("m"), "tu", "m")).toBe("luca");
  expect(dialogueVoice(withOther("f"), "tu", "f")).toBe("sofia");
  expect(dialogueVoice(withOther("m"), "altul", "m")).toBe("francesco");
  expect(dialogueVoice(withOther("f"), "altul", "f")).toBe("giullia");
});
