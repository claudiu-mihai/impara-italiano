import { ClientResponseError } from "pocketbase";
import { describe, expect, it } from "vitest";
import { normalizeEmail, passwordProblem, registerErrorMessage } from "./messages.ts";

// formele reale ale răspunsurilor PocketBase 0.40, verificate pe un server pornit
const fail = (status: number, data: Record<string, { code: string; message: string }> = {}) =>
  new ClientResponseError({ url: "http://x/api/collections/users/records", status, response: { status, message: "Failed to create record.", data } });

describe("registerErrorMessage", () => {
  it("email deja folosit", () => {
    expect(registerErrorMessage(fail(400, { email: { code: "validation_not_unique", message: "Value must be unique." } }))).toBe(
      "Există deja un cont cu acest email.",
    );
  });

  it("email invalid", () => {
    expect(registerErrorMessage(fail(400, { email: { code: "validation_is_email", message: "Must be a valid email address." } }))).toBe(
      "Adresa de email nu este validă.",
    );
  });

  it("parolă prea scurtă și alte probleme de parolă", () => {
    expect(registerErrorMessage(fail(400, { password: { code: "validation_min_text_constraint", message: "x" } }))).toBe(
      "Parola trebuie să aibă cel puțin 8 caractere.",
    );
    expect(registerErrorMessage(fail(400, { password: { code: "altceva", message: "x" } }))).toContain("8–71");
  });

  it("parole diferite", () => {
    expect(registerErrorMessage(fail(400, { passwordConfirm: { code: "validation_values_mismatch", message: "x" } }))).toBe("Parolele nu coincid.");
  });

  it("400 fără detalii înseamnă parolă prea lungă", () => {
    expect(registerErrorMessage(fail(400))).toContain("8–71");
  });

  it("limita de conturi, înregistrare indisponibilă și lipsa conexiunii", () => {
    expect(registerErrorMessage(fail(429))).toBe("Prea multe conturi create de pe această adresă. Încearcă din nou mai târziu.");
    expect(registerErrorMessage(fail(403))).toBe("Crearea de conturi nu este disponibilă acum.");
    expect(registerErrorMessage(fail(0))).toBe("Nu pot contacta serverul. Verifică conexiunea.");
  });

  it("orice altceva primește un mesaj general, fără să arunce", () => {
    expect(registerErrorMessage(fail(500))).toBe("Nu am putut crea contul. Încearcă din nou.");
    expect(registerErrorMessage(undefined)).toBe("Nu am putut crea contul. Încearcă din nou.");
    expect(registerErrorMessage(new Error("boom"))).toBe("Nu am putut crea contul. Încearcă din nou.");
  });
});

describe("passwordProblem", () => {
  it("cere cel puțin 8 caractere", () => {
    expect(passwordProblem("1234567")).toBe("Parola trebuie să aibă cel puțin 8 caractere.");
    expect(passwordProblem("12345678")).toBeUndefined();
  });

  it("limita de 71 de octeți: diacriticele contează dublu", () => {
    expect(passwordProblem("a".repeat(71))).toBeUndefined();
    expect(passwordProblem("a".repeat(72))).toContain("cel mult 71");
    expect(passwordProblem("ă".repeat(35))).toBeUndefined(); // 70 de octeți
    expect(passwordProblem("ă".repeat(36))).toContain("cel mult 71"); // 72 de octeți
  });

  it("verifică confirmarea doar când e dată", () => {
    expect(passwordProblem("parola-buna", "parola-buna")).toBeUndefined();
    expect(passwordProblem("parola-buna", "alta-parola")).toBe("Parolele nu coincid.");
    expect(passwordProblem("parola-buna")).toBeUndefined();
  });
});

describe("normalizeEmail", () => {
  it("taie spațiile și folosește litere mici", () => {
    expect(normalizeEmail("  Ion.Popescu@Example.COM ")).toBe("ion.popescu@example.com");
  });
});
