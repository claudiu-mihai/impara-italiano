import { expect, test } from "vitest";
import { TENSES } from "../../src/domain/content/constants.ts";
import { loadContent } from "../content.ts";
import { condizionale, congiuntivoRegular, futuro, futureStem, imperfetto } from "./rules.ts";

const { conjugations, errors } = loadContent();
const forms = (verb: string, tense: keyof (typeof conjugations)[string]) =>
  (conjugations[`v-${verb}`]?.[tense] ?? []).map((f) => f.join("/"));

test("conținutul încărcat nu are erori", () => {
  expect(errors).toEqual([]);
});

test("imperfetto: reguli, teme speciale și essere", () => {
  expect(imperfetto("parlare")).toEqual(["parlavo", "parlavi", "parlava", "parlavamo", "parlavate", "parlavano"]);
  expect(forms("credere", "imperfetto")[0]).toBe("credevo");
  expect(forms("finire", "imperfetto")[5]).toBe("finivano");
  expect(forms("fare", "imperfetto")).toEqual(["facevo", "facevi", "faceva", "facevamo", "facevate", "facevano"]);
  expect(forms("dire", "imperfetto")[0]).toBe("dicevo");
  expect(forms("bere", "imperfetto")[3]).toBe("bevevamo");
  expect(forms("essere", "imperfetto")).toEqual(["ero", "eri", "era", "eravamo", "eravate", "erano"]);
});

test("futuro semplice: tema regulată și modificările ortografice", () => {
  expect(futureStem("parlare", "are")).toBe("parler");
  expect(futureStem("giocare", "are")).toBe("giocher");
  expect(futureStem("mangiare", "are")).toBe("manger");
  expect(futureStem("cominciare", "are")).toBe("comincer");
  expect(futureStem("sentire", "ire")).toBe("sentir");
  expect(futuro("parler")).toEqual(["parlerò", "parlerai", "parlerà", "parleremo", "parlerete", "parleranno"]);
});

test("futuro: teme neregulate (persoana I singular)", () => {
  const io: Record<string, string> = {
    andare: "andrò", avere: "avrò", bere: "berrò", dare: "darò", dire: "dirò", dovere: "dovrò",
    essere: "sarò", fare: "farò", potere: "potrò", rimanere: "rimarrò", sapere: "saprò", stare: "starò",
    venire: "verrò", vedere: "vedrò", volere: "vorrò", uscire: "uscirò", conoscere: "conoscerò",
    mangiare: "mangerò", giocare: "giocherò", lasciare: "lascerò", cominciare: "comincerò", morire: "morirò",
    vivere: "vivrò", // viverò este arhaic (verificat în Wiktionary)
  };
  for (const [verb, expected] of Object.entries(io)) expect(forms(verb, "futuro")[0], verb).toBe(expected);
});

test("condizionale presente: aceeași temă cu futuro", () => {
  expect(condizionale("parler")).toEqual(["parlerei", "parleresti", "parlerebbe", "parleremmo", "parlereste", "parlerebbero"]);
  expect(forms("essere", "condizionale")).toEqual(["sarei", "saresti", "sarebbe", "saremmo", "sareste", "sarebbero"]);
  expect(forms("andare", "condizionale")[2]).toBe("andrebbe");
  expect(forms("volere", "condizionale")[0]).toBe("vorrei");
  expect(forms("potere", "condizionale")[3]).toBe("potremmo");
  expect(forms("giocare", "condizionale")[0]).toBe("giocherei");
});

test("congiuntivo presente regulat", () => {
  expect(congiuntivoRegular("parlare", "are")).toEqual(["parli", "parli", "parli", "parliamo", "parliate", "parlino"]);
  expect(congiuntivoRegular("credere", "ere")).toEqual(["creda", "creda", "creda", "crediamo", "crediate", "credano"]);
  expect(congiuntivoRegular("sentire", "ire")).toEqual(["senta", "senta", "senta", "sentiamo", "sentiate", "sentano"]);
  expect(congiuntivoRegular("capire", "isc")).toEqual(["capisca", "capisca", "capisca", "capiamo", "capiate", "capiscano"]);
  expect(congiuntivoRegular("giocare", "are")).toEqual(["giochi", "giochi", "giochi", "giochiamo", "giochiate", "giochino"]);
  expect(congiuntivoRegular("mangiare", "are")).toEqual(["mangi", "mangi", "mangi", "mangiamo", "mangiate", "mangino"]);
});

test("congiuntivo: forme neregulate (io și loro)", () => {
  const io: Record<string, [string, string]> = {
    essere: ["sia", "siano"], avere: ["abbia", "abbiano"], fare: ["faccia", "facciano"], dire: ["dica", "dicano"],
    andare: ["vada", "vadano"], potere: ["possa", "possano"], volere: ["voglia", "vogliano"],
    sapere: ["sappia", "sappiano"], venire: ["venga", "vengano"], dare: ["dia", "diano"], stare: ["stia", "stiano"],
    rimanere: ["rimanga", "rimangano"], morire: ["muoia", "muoiano"], uscire: ["esca", "escano"],
    bere: ["beva", "bevano"], piacere: ["piaccia", "piacciano"],
    // regulate, dar cu verificare explicită
    vedere: ["veda", "vedano"], prendere: ["prenda", "prendano"], mettere: ["metta", "mettano"],
    conoscere: ["conosca", "conoscano"], leggere: ["legga", "leggano"], aprire: ["apra", "aprano"],
    cominciare: ["cominci", "comincino"], lasciare: ["lasci", "lascino"],
  };
  for (const [verb, [singular, plural]] of Object.entries(io)) {
    const f = forms(verb, "congiuntivo");
    expect(f[0], `${verb} io`).toBe(singular);
    expect(f[5], `${verb} loro`).toBe(plural);
  }
  expect(forms("dovere", "congiuntivo")).toEqual(["debba", "debba", "debba", "dobbiamo", "dobbiate", "debbano"]);
  expect(forms("uscire", "congiuntivo")).toEqual(["esca", "esca", "esca", "usciamo", "usciate", "escano"]);
});

test("toate verbele au cele 6 timpuri, cu 6 persoane și forme valide", () => {
  const tenses = ["presente", "passatoProssimo", "imperfetto", "futuro", "condizionale", "congiuntivo"] as const;
  for (const [id, verb] of Object.entries(conjugations)) {
    for (const tense of tenses) {
      const persons = verb[tense];
      expect(persons, `${id} ${tense}`).toHaveLength(6);
      for (const alternatives of persons ?? []) {
        expect(alternatives.length).toBeGreaterThan(0);
        for (const form of alternatives) expect(form, `${id} ${tense}`).toMatch(/^[a-zàèéìòù' ]+$/);
      }
    }
    // io, tu și lui/lei au aceeași formă la congiuntivo
    const c = verb.congiuntivo!;
    // la verbele reflexive diferă doar pronumele (mi/ti/si chiami)
    const bare = (alternatives: string[]) => alternatives.map((f) => f.replace(/^(mi|ti|si) /, ""));
    expect(bare(c[1]!)).toEqual(bare(c[0]!));
    expect(bare(c[2]!)).toEqual(bare(c[0]!));
  }
  expect(Object.keys(conjugations).length).toBeGreaterThanOrEqual(50);
});

test("imperativo: 5 persoane, tu diferă între grupe, Lei/Loro din congiuntivo, excepții", () => {
  expect(forms("parlare", "imperativo")).toEqual(["parla", "parli", "parliamo", "parlate", "parlino"]);
  expect(forms("credere", "imperativo")).toEqual(["credi", "creda", "crediamo", "credete", "credano"]);
  expect(forms("finire", "imperativo")).toEqual(["finisci", "finisca", "finiamo", "finite", "finiscano"]);
  expect(forms("giocare", "imperativo")).toEqual(["gioca", "giochi", "giochiamo", "giocate", "giochino"]);
  expect(forms("venire", "imperativo")[0]).toBe("vieni");
  expect(forms("andare", "imperativo")).toEqual(["va'/vai", "vada", "andiamo", "andate", "vadano"]);
  expect(forms("essere", "imperativo")).toEqual(["sii", "sia", "siamo", "siate", "siano"]);
  expect(forms("sapere", "imperativo")[3]).toBe("sappiate");
  expect(forms("dire", "imperativo")[0]).toBe("di'");
  // verbele modale nu au imperativ
  for (const modal of ["potere", "dovere", "volere"]) expect(conjugations[`v-${modal}`]?.imperativo).toBeUndefined();
});

test("ordinea timpurilor rămâne cea din plan", () => {
  expect(TENSES.indexOf("imperfetto")).toBeLessThan(TENSES.indexOf("futuro"));
  expect(TENSES.indexOf("condizionale")).toBeLessThan(TENSES.indexOf("congiuntivo"));
  expect(TENSES.indexOf("imperativo")).toBeLessThan(TENSES.indexOf("imperfetto"));
});

test("verbe reflexive: pronume înaintea formei, essere la passato prossimo, enclitice la imperativ", () => {
  expect(forms("chiamarsi", "presente")).toEqual(["mi chiamo", "ti chiami", "si chiama", "ci chiamiamo", "vi chiamate", "si chiamano"]);
  expect(forms("chiamarsi", "passatoProssimo")[0]).toBe("mi sono chiamato/mi sono chiamata");
  expect(forms("chiamarsi", "passatoProssimo")[3]).toBe("ci siamo chiamati/ci siamo chiamate");
  expect(forms("chiamarsi", "futuro")[0]).toBe("mi chiamerò");
  expect(forms("chiamarsi", "imperativo")).toEqual(["chiamati", "si chiami", "chiamiamoci", "chiamatevi", "si chiamino"]);
  // excepțiile verbului de bază se păstrează (sedere → siedo)
  expect(forms("sedersi", "presente")[0]).toBe("mi siedo");
  expect(forms("sedersi", "imperativo")[0]).toBe("siediti");
  expect(forms("mettersi", "passatoProssimo")[0]).toBe("mi sono messo/mi sono messa");
});
