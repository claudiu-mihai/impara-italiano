import { expect, test } from "vitest";
import { numberForms, numberToItalian } from "./numbers.ts";

test("0–20 și zecile", () => {
  expect(numberToItalian(0)).toBe("zero");
  expect(numberToItalian(3)).toBe("tre");
  expect(numberToItalian(16)).toBe("sedici");
  expect(numberToItalian(19)).toBe("diciannove");
  expect(numberToItalian(20)).toBe("venti");
  expect(numberToItalian(90)).toBe("novanta");
});

test("21–99: elidarea vocalei (ventuno, ventotto) și accentul pe tré", () => {
  expect(numberToItalian(21)).toBe("ventuno");
  expect(numberToItalian(22)).toBe("ventidue");
  expect(numberToItalian(23)).toBe("ventitré");
  expect(numberToItalian(28)).toBe("ventotto");
  expect(numberToItalian(31)).toBe("trentuno");
  expect(numberToItalian(33)).toBe("trentatré");
  expect(numberToItalian(48)).toBe("quarantotto");
  expect(numberToItalian(99)).toBe("novantanove");
});

test("sute: cento, centottanta, accent la final", () => {
  expect(numberToItalian(100)).toBe("cento");
  expect(numberToItalian(101)).toBe("centouno");
  expect(numberToItalian(103)).toBe("centotré");
  expect(numberToItalian(128)).toBe("centoventotto");
  expect(numberToItalian(180)).toBe("centottanta");
  expect(numberToItalian(200)).toBe("duecento");
  expect(numberToItalian(342)).toBe("trecentoquarantadue");
  expect(numberToItalian(999)).toBe("novecentonovantanove");
  expect(numberForms(180)).toEqual(["centottanta", "centoottanta"]);
  expect(numberForms(108)).toEqual(["centotto", "centootto"]);
});

test("mii: mille, duemila, ventunomila", () => {
  expect(numberToItalian(1000)).toBe("mille");
  expect(numberToItalian(1001)).toBe("milleuno");
  expect(numberToItalian(1999)).toBe("millenovecentonovantanove");
  expect(numberToItalian(2000)).toBe("duemila");
  expect(numberToItalian(2023)).toBe("duemilaventitré");
  expect(numberToItalian(3000)).toBe("tremila");
  expect(numberToItalian(21000)).toBe("ventunomila");
  expect(numberToItalian(23000)).toBe("ventitremila");
  expect(numberToItalian(100000)).toBe("centomila");
  expect(numberToItalian(999999)).toBe("novecentonovantanovemilanovecentonovantanove");
});

test("milioane", () => {
  expect(numberToItalian(1_000_000)).toBe("un milione");
  expect(numberToItalian(2_000_000)).toBe("due milioni");
  expect(numberToItalian(2_500_000)).toBe("due milioni cinquecentomila");
});

test("în afara intervalului aruncă o eroare", () => {
  expect(() => numberToItalian(-1)).toThrow(RangeError);
  expect(() => numberToItalian(1.5)).toThrow(RangeError);
});
