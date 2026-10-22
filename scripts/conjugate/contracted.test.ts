import { expect, test } from "vitest";
import type { ParsedVerb } from "../../src/domain/content/schema.ts";
import { buildConjugations } from "./build.ts";
import { contractedParticiple, futureStem, imperfetto, presenteRegular } from "./rules.ts";

// Paradigmele sunt scrise de mână din gramatica italiană (nu din generator): cele trei familii de verbe în -rre.

const verbOf = (it: string, pastParticiple: string, over: Partial<ParsedVerb> = {}) =>
  ({
    id: `v-${it}`, it, ro: "x", pos: "verb", tags: [], rank: 1, examples: [{ it: "x", ro: "x" }],
    group: "ere", auxiliary: "avere", pastParticiple, irregular: true, reflexive: false, ...over,
  }) as ParsedVerb;

function conjugate(it: string, pastParticiple: string, over: Partial<ParsedVerb> = {}) {
  const verb = verbOf(it, pastParticiple, over);
  const { conjugations, errors } = buildConjugations([verb], { presente: {} });
  const forms = (tense: keyof (typeof conjugations)[string]) => (conjugations[verb.id]?.[tense] ?? []).map((f) => f.join("/"));
  return { forms, errors };
}

test("porre: presente, imperfetto, futuro, condizionale, congiuntivo, imperativo, passato prossimo", () => {
  const { forms, errors } = conjugate("porre", "posto");
  expect(errors).toEqual([]);
  expect(forms("presente")).toEqual(["pongo", "poni", "pone", "poniamo", "ponete", "pongono"]);
  expect(forms("imperfetto")).toEqual(["ponevo", "ponevi", "poneva", "ponevamo", "ponevate", "ponevano"]);
  expect(forms("futuro")).toEqual(["porrò", "porrai", "porrà", "porremo", "porrete", "porranno"]);
  expect(forms("condizionale")).toEqual(["porrei", "porresti", "porrebbe", "porremmo", "porreste", "porrebbero"]);
  expect(forms("congiuntivo")).toEqual(["ponga", "ponga", "ponga", "poniamo", "poniate", "pongano"]);
  expect(forms("imperativo")).toEqual(["poni", "ponga", "poniamo", "ponete", "pongano"]);
  expect(forms("passatoProssimo")).toEqual(["ho posto", "hai posto", "ha posto", "abbiamo posto", "avete posto", "hanno posto"]);
});

test("derivatele lui porre păstrează prefixul (dublarea consoanei vine din prefix, nu din regulă)", () => {
  const supporre = conjugate("supporre", "supposto");
  expect(supporre.errors).toEqual([]);
  expect(supporre.forms("presente")).toEqual(["suppongo", "supponi", "suppone", "supponiamo", "supponete", "suppongono"]);
  expect(supporre.forms("futuro")[0]).toBe("supporrò");
  expect(supporre.forms("congiuntivo")[5]).toBe("suppongano");

  expect(conjugate("proporre", "proposto").forms("presente")).toEqual(["propongo", "proponi", "propone", "proponiamo", "proponete", "propongono"]);
  expect(conjugate("esporre", "esposto").forms("imperfetto")[0]).toBe("esponevo");
  expect(conjugate("comporre", "composto").forms("presente")[1]).toBe("componi");
  expect(conjugate("disporre", "disposto").forms("condizionale")[0]).toBe("disporrei");
  expect(conjugate("imporre", "imposto").forms("congiuntivo")[3]).toBe("imponiamo");
});

test("trarre: tema tra- (trai, trae) și tragg- (traggo, traggono)", () => {
  const { forms, errors } = conjugate("trarre", "tratto");
  expect(errors).toEqual([]);
  expect(forms("presente")).toEqual(["traggo", "trai", "trae", "traiamo", "traete", "traggono"]);
  expect(forms("imperfetto")).toEqual(["traevo", "traevi", "traeva", "traevamo", "traevate", "traevano"]);
  expect(forms("futuro")).toEqual(["trarrò", "trarrai", "trarrà", "trarremo", "trarrete", "trarranno"]);
  expect(forms("condizionale")).toEqual(["trarrei", "trarresti", "trarrebbe", "trarremmo", "trarreste", "trarrebbero"]);
  expect(forms("congiuntivo")).toEqual(["tragga", "tragga", "tragga", "traiamo", "traiate", "traggano"]);
  expect(forms("imperativo")).toEqual(["trai", "tragga", "traiamo", "traete", "traggano"]);
  expect(forms("passatoProssimo")[0]).toBe("ho tratto");

  expect(conjugate("attrarre", "attratto").forms("presente")).toEqual(["attraggo", "attrai", "attrae", "attraiamo", "attraete", "attraggono"]);
  expect(conjugate("estrarre", "estratto").forms("imperfetto")[0]).toBe("estraevo");
  expect(conjugate("contrarre", "contratto").forms("futuro")[0]).toBe("contrarrò");
  expect(conjugate("ritrarre", "ritratto").forms("congiuntivo")[0]).toBe("ritragga");
});

test("verbele în -durre: conduco, conduci… condotto", () => {
  const { forms, errors } = conjugate("condurre", "condotto");
  expect(errors).toEqual([]);
  expect(forms("presente")).toEqual(["conduco", "conduci", "conduce", "conduciamo", "conducete", "conducono"]);
  expect(forms("imperfetto")).toEqual(["conducevo", "conducevi", "conduceva", "conducevamo", "conducevate", "conducevano"]);
  expect(forms("futuro")).toEqual(["condurrò", "condurrai", "condurrà", "condurremo", "condurrete", "condurranno"]);
  expect(forms("condizionale")).toEqual(["condurrei", "condurresti", "condurrebbe", "condurremmo", "condurreste", "condurrebbero"]);
  expect(forms("congiuntivo")).toEqual(["conduca", "conduca", "conduca", "conduciamo", "conduciate", "conducano"]);
  expect(forms("imperativo")).toEqual(["conduci", "conduca", "conduciamo", "conducete", "conducano"]);

  expect(conjugate("tradurre", "tradotto").forms("presente")).toEqual(["traduco", "traduci", "traduce", "traduciamo", "traducete", "traducono"]);
  expect(conjugate("produrre", "prodotto").forms("futuro")[2]).toBe("produrrà");
  expect(conjugate("ridurre", "ridotto").forms("imperfetto")[3]).toBe("riducevamo");
});

test("formele ajutătoare: participiu, temă de viitor, imperfetto, presente", () => {
  expect(contractedParticiple("supporre")).toBe("supposto");
  expect(contractedParticiple("attrarre")).toBe("attratto");
  expect(contractedParticiple("introdurre")).toBe("introdotto");
  expect(futureStem("condurre", "ere")).toBe("condurr");
  expect(imperfetto("porre")).toEqual(["ponevo", "ponevi", "poneva", "ponevamo", "ponevate", "ponevano"]);
  expect(presenteRegular("trarre", "ere")[1]).toBe("trai");
});

test("verificări: -rre neregulat, din grupa ere, cu participiul familiei, doar familii cunoscute", () => {
  expect(conjugate("supporre", "supposto", { irregular: false }).errors).toContain("v-supporre: verbele în -rre sunt mereu neregulate");
  expect(conjugate("supporre", "supposto", { group: "ire" }).errors.join()).toContain('din grupa "ere"');
  expect(conjugate("supporre", "supporto").errors.join()).toContain('participiul "supporto" ≠ "supposto"');
  // un verb în -rre din afara celor trei familii nu se conjugă „la nimereală”
  const unknown = conjugate("sorre", "sorto");
  expect(unknown.errors.join()).toContain("din afara familiilor porre / trarre / -durre");
  expect(unknown.forms("presente")).toEqual([]);
});
