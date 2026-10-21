import { expect, test } from "vitest";
import { formatDigital, timeForms, timePhrase } from "./time.ts";

test("ora fixă: «è l'una» la singular, «sono le…» în rest", () => {
  expect(timePhrase({ hour: 1, minute: 0 })).toBe("è l'una");
  expect(timePhrase({ hour: 3, minute: 0 })).toBe("sono le tre");
  expect(timeForms({ hour: 5, minute: 0 })).toContain("sono le cinque in punto");
  expect(timeForms({ hour: 12, minute: 0 })).toEqual(
    expect.arrayContaining(["sono le dodici", "è mezzogiorno", "è mezzanotte", "mezzogiorno"]),
  );
});

test("după ora fixă: minute, sfert, jumătate", () => {
  expect(timePhrase({ hour: 1, minute: 10 })).toBe("è l'una e dieci");
  expect(timePhrase({ hour: 3, minute: 10 })).toBe("sono le tre e dieci");
  expect(timePhrase({ hour: 6, minute: 15 })).toBe("sono le sei e un quarto");
  expect(timeForms({ hour: 6, minute: 15 })).toContain("sono le sei e quindici");
  expect(timeForms({ hour: 2, minute: 30 })).toEqual(
    expect.arrayContaining(["sono le due e mezza", "sono le due e mezzo", "sono le due e trenta", "le due e mezza"]),
  );
  expect(timePhrase({ hour: 8, minute: 25 })).toBe("sono le otto e venticinque");
});

test("după jumătate se scade din ora următoare: «meno»", () => {
  expect(timePhrase({ hour: 7, minute: 45 })).toBe("sono le otto meno un quarto");
  expect(timeForms({ hour: 7, minute: 45 })).toEqual(
    expect.arrayContaining(["sono le sette e tre quarti", "sono le sette e quarantacinque", "le otto meno un quarto"]),
  );
  expect(timePhrase({ hour: 3, minute: 40 })).toBe("sono le quattro meno venti");
  expect(timePhrase({ hour: 12, minute: 50 })).toBe("è l'una meno dieci");
  expect(timePhrase({ hour: 11, minute: 55 })).toBe("sono le dodici meno cinque");
});

test("ore invalide aruncă o eroare; formatul digital", () => {
  expect(() => timeForms({ hour: 0, minute: 0 })).toThrow(RangeError);
  expect(() => timeForms({ hour: 5, minute: 60 })).toThrow(RangeError);
  expect(formatDigital({ hour: 7, minute: 5 })).toBe("7:05");
});
