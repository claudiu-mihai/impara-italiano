import { describe, expect, it } from "vitest";

import { spokenConjugation } from "./spokenConjugation.ts";

describe("spokenConjugation", () => {
  it("pune pronumele înaintea formei", () => {
    expect(spokenConjugation("presente", 0, ["parlo"])).toBe("io parlo");
    expect(spokenConjugation("passatoProssimo", 3, ["abbiamo parlato"])).toBe("noi abbiamo parlato");
    expect(spokenConjugation("futuro", 5, ["parleranno"])).toBe("loro parleranno");
  });

  it("la „lui/lei” rostește doar „lui”", () => {
    expect(spokenConjugation("presente", 2, ["parla"])).toBe("lui parla");
  });

  it("la congiuntivo pune „che” înainte", () => {
    expect(spokenConjugation("congiuntivo", 0, ["parli"])).toBe("che io parli");
    expect(spokenConjugation("congiuntivo", 2, ["vada"])).toBe("che lui vada");
  });

  it("la imperativ nu pune pronume și rostește ca o comandă", () => {
    expect(spokenConjugation("imperativo", 0, ["parla"])).toBe("Parla!");
    expect(spokenConjugation("imperativo", 1, ["parli"])).toBe("Parli!");
    expect(spokenConjugation("imperativo", 4, ["parlino"])).toBe("Parlino!");
  });

  it("alege prima formă fără apostrof", () => {
    expect(spokenConjugation("imperativo", 0, ["va'", "vai"])).toBe("Vai!");
    expect(spokenConjugation("imperativo", 0, ["di'"])).toBe("Di'!");
  });

  it("la acordul cu essere rostește prima formă", () => {
    expect(spokenConjugation("passatoProssimo", 0, ["sono andato", "sono andata"])).toBe("io sono andato");
  });

  it("verbele reflexive au deja pronumele în formă", () => {
    expect(spokenConjugation("presente", 0, ["mi sveglio"])).toBe("io mi sveglio");
    expect(spokenConjugation("congiuntivo", 3, ["ci svegliamo"])).toBe("che noi ci svegliamo");
    expect(spokenConjugation("imperativo", 1, ["si svegli"])).toBe("Si svegli!");
  });
});
