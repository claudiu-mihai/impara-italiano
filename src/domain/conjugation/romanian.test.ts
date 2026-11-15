import { expect, test } from "vitest";
import { romanianForms, romanianPrompt, type RoVerb } from "./romanian.ts";

const VORBI: RoVerb = {
  id: "v-parlare",
  inf: "vorbi",
  part: "vorbit",
  pres: ["vorbesc", "vorbești", "vorbește", "vorbim", "vorbiți", "vorbesc"],
  impf: "vorbea",
  conj3: "vorbească",
  imp: ["vorbește", "vorbiți"],
};

const TREZI: RoVerb = {
  id: "v-svegliarsi",
  refl: "acc",
  inf: "trezi",
  part: "trezit",
  pres: ["trezesc", "trezești", "trezește", "trezim", "treziți", "trezesc"],
  impf: "trezea",
  conj3: "trezească",
  imp: ["trezește-te", "treziți-vă"],
};

const AMINTI: RoVerb = {
  id: "v-ricordare",
  refl: "dat",
  inf: "aminti",
  part: "amintit",
  pres: ["amintesc", "amintești", "amintește", "amintim", "amintiți", "amintesc"],
  impf: "amintea",
  conj3: "amintească",
  imp: ["amintește-ți", "amintiți-vă"],
};

test("verb obișnuit: timpurile simple din formele scrise, cele compuse cu auxiliare", () => {
  expect(romanianForms(VORBI, "presente")).toEqual(VORBI.pres);
  expect(romanianForms(VORBI, "imperfetto")).toEqual(["vorbeam", "vorbeai", "vorbea", "vorbeam", "vorbeați", "vorbeau"]);
  expect(romanianForms(VORBI, "passatoProssimo")).toEqual(["am vorbit", "ai vorbit", "a vorbit", "am vorbit", "ați vorbit", "au vorbit"]);
  expect(romanianForms(VORBI, "futuro")).toEqual(["voi vorbi", "vei vorbi", "va vorbi", "vom vorbi", "veți vorbi", "vor vorbi"]);
  expect(romanianForms(VORBI, "condizionale")).toEqual(["aș vorbi", "ai vorbi", "ar vorbi", "am vorbi", "ați vorbi", "ar vorbi"]);
  expect(romanianForms(VORBI, "congiuntivo")).toEqual([
    "să vorbesc",
    "să vorbești",
    "să vorbească",
    "să vorbim",
    "să vorbiți",
    "să vorbească",
  ]);
});

test("imperativul are persoanele italiene: tu, Lei, noi, voi, Loro (politețea cu plurala)", () => {
  expect(romanianForms(VORBI, "imperativo")).toEqual(["vorbește!", "vorbiți!", "să vorbim!", "vorbiți!", "vorbiți!"]);
  expect(romanianForms({ ...VORBI, imp: undefined }, "imperativo")).toBeUndefined();
});

test("reflexiv cu acuzativ: pronumele și formele contrase", () => {
  expect(romanianForms(TREZI, "presente")?.[0]).toBe("mă trezesc");
  expect(romanianForms(TREZI, "passatoProssimo")).toEqual(["m-am trezit", "te-ai trezit", "s-a trezit", "ne-am trezit", "v-ați trezit", "s-au trezit"]);
  expect(romanianForms(TREZI, "futuro")?.[2]).toBe("se va trezi");
  expect(romanianForms(TREZI, "condizionale")?.[0]).toBe("m-aș trezi");
  expect(romanianForms(TREZI, "congiuntivo")?.[4]).toBe("să vă treziți");
  expect(romanianForms(TREZI, "imperativo")).toEqual(["trezește-te!", "treziți-vă!", "să ne trezim!", "treziți-vă!", "treziți-vă!"]);
});

test("reflexiv cu dativ: îmi amintesc, mi-am amintit, să-și amintească", () => {
  expect(romanianForms(AMINTI, "presente")?.[0]).toBe("îmi amintesc");
  expect(romanianForms(AMINTI, "imperfetto")?.[5]).toBe("își aminteau");
  expect(romanianForms(AMINTI, "passatoProssimo")?.[2]).toBe("și-a amintit");
  expect(romanianForms(AMINTI, "condizionale")?.[1]).toBe("ți-ai aminti");
  expect(romanianForms(AMINTI, "congiuntivo")?.[2]).toBe("să-și amintească");
});

test("conjunctivul complet și timpurile scrise integral înlocuiesc regulile", () => {
  const fi: RoVerb = { ...VORBI, id: "v-essere", conj: ["fiu", "fii", "fie", "fim", "fiți", "fie"] };
  expect(romanianForms(fi, "congiuntivo")?.[0]).toBe("să fiu");
  const trebui: RoVerb = { id: "v-dovere", tenses: { presente: Array(6).fill("trebuie să") } };
  expect(romanianForms(trebui, "presente")?.[3]).toBe("trebuie să");
  expect(romanianForms(trebui, "futuro")).toBeUndefined();
});

test("cerința are pronumele românesc al persoanei", () => {
  expect(romanianPrompt(VORBI, "passatoProssimo", 3)).toBe("noi am vorbit");
  expect(romanianPrompt(VORBI, "presente", 2)).toBe("el/ea vorbește");
  expect(romanianPrompt(VORBI, "imperativo", 1)).toBe("dvs. vorbiți!");
  expect(romanianPrompt({ id: "v-x" }, "presente", 0)).toBeUndefined();
});
