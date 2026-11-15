import type { Tense } from "../content/constants.ts";
import { personsOf } from "../content/display.ts";

/**
 * Formele românești de bază ale unui verb din lista de conjugare (content/verbs/romanian.json). Din ele se compun toate
 * timpurile, ca cerința să aibă sens („noi am vorbit → ?”), nu doar etichetă („parlare · noi”).
 * Prezentul, participiul, imperfectul, conjunctivul și imperativul se scriu de mână (sunt neregulate în română);
 * perfectul compus, viitorul și condiționalul se compun cu auxiliarele. Formele se scriu fără pronumele reflexiv,
 * în afară de imperativ, unde pronumele e lipit de verb (trezește-te).
 */
export interface RoVerb {
  /** Id-ul verbului italian (v-parlare). */
  id: string;
  /** Infinitivul fără „a” (vorbi). */
  inf?: string;
  /** Participiul (vorbit). */
  part?: string;
  /** Prezentul, pe cele 6 persoane (vorbesc, vorbești, vorbește, vorbim, vorbiți, vorbesc). */
  pres?: string[];
  /** Imperfectul la persoana a 3-a singular (vorbea); restul persoanelor se formează cu terminații. */
  impf?: string;
  /** Conjunctivul la persoana a 3-a, fără „să” (vorbească); celelalte persoane sunt ca la prezent. */
  conj3?: string;
  /** Conjunctivul complet, fără „să”, când nu urmează prezentul (a fi: fiu, fii, fie…). */
  conj?: string[];
  /** Imperativul la persoana a 2-a singular și plural (vorbește, vorbiți), fără semnul exclamării. */
  imp?: string[];
  /** Verb reflexiv în română: „acc” (mă trezesc), „dat” (îmi amintesc). */
  refl?: "acc" | "dat";
  /** Formele complete ale unui timp, când regulile nu se aplică (a trebui: „trebuie să” la toate persoanele). */
  tenses?: Partial<Record<Tense, string[]>>;
}

/** Verbele din lista de conjugare, după id-ul verbului italian. */
export type RoConjugations = Record<string, RoVerb>;

const AUX_PERFECT = ["am", "ai", "a", "am", "ați", "au"];
const AUX_FUTURE = ["voi", "vei", "va", "vom", "veți", "vor"];
const AUX_CONDITIONAL = ["aș", "ai", "ar", "am", "ați", "ar"];
const IMPERFECT_ENDINGS = ["m", "i", "", "m", "ți", "u"];

/** Pronumele reflexive, cu formele contrase cerute de auxiliare (m-am, s-ar, să-mi). */
const CLITICS = {
  acc: {
    plain: ["mă", "te", "se", "ne", "vă", "se"],
    perfect: ["m-am", "te-ai", "s-a", "ne-am", "v-ați", "s-au"],
    conditional: ["m-aș", "te-ai", "s-ar", "ne-am", "v-ați", "s-ar"],
    subjunctive: ["să mă", "să te", "să se", "să ne", "să vă", "să se"],
  },
  dat: {
    plain: ["îmi", "îți", "își", "ne", "vă", "își"],
    perfect: ["mi-am", "ți-ai", "și-a", "ne-am", "v-ați", "și-au"],
    conditional: ["mi-aș", "ți-ai", "și-ar", "ne-am", "v-ați", "și-ar"],
    subjunctive: ["să-mi", "să-ți", "să-și", "să ne", "să vă", "să-și"],
  },
} as const;

const PERSONS = [0, 1, 2, 3, 4, 5];

function subjunctive(verb: RoVerb): string[] | undefined {
  const base = verb.conj ?? (verb.pres && verb.conj3 ? [verb.pres[0]!, verb.pres[1]!, verb.conj3, verb.pres[3]!, verb.pres[4]!, verb.conj3] : undefined);
  if (!base) return undefined;
  const clitics = verb.refl && CLITICS[verb.refl];
  return base.map((form, i) => `${clitics ? clitics.subjunctive[i] : "să"} ${form}`);
}

/**
 * Formele românești ale unui timp, câte una pentru fiecare persoană din datele italiene (6, imperativul 5),
 * fără pronumele personal; `undefined` dacă verbului îi lipsesc formele de bază necesare.
 */
export function romanianForms(verb: RoVerb, tense: Tense): string[] | undefined {
  const override = verb.tenses?.[tense];
  if (override) return override;

  const clitics = verb.refl && CLITICS[verb.refl];
  const withClitic = (i: number, form: string) => (clitics ? `${clitics.plain[i]} ${form}` : form);

  switch (tense) {
    case "presente":
      return verb.pres?.map((form, i) => withClitic(i, form));
    case "imperfetto":
      return verb.impf === undefined ? undefined : PERSONS.map((i) => withClitic(i, `${verb.impf}${IMPERFECT_ENDINGS[i]}`));
    case "passatoProssimo":
      return verb.part === undefined
        ? undefined
        : PERSONS.map((i) => `${clitics ? clitics.perfect[i] : AUX_PERFECT[i]} ${verb.part}`);
    case "futuro":
      return verb.inf === undefined ? undefined : PERSONS.map((i) => withClitic(i, `${AUX_FUTURE[i]} ${verb.inf}`));
    case "condizionale":
      return verb.inf === undefined
        ? undefined
        : PERSONS.map((i) => `${clitics ? clitics.conditional[i] : AUX_CONDITIONAL[i]} ${verb.inf}`);
    case "congiuntivo":
      return subjunctive(verb);
    case "imperativo": {
      // persoanele italiene: tu, Lei, noi, voi, Loro; politețea (Lei, Loro) se spune în română cu plurala (vorbiți!)
      const noi = subjunctive(verb)?.[3];
      if (!verb.imp || !noi) return undefined;
      const [tu, voi] = verb.imp as [string, string];
      return [tu, voi, noi, voi, voi].map((form) => `${form}!`);
    }
  }
}

/** Cerința în română pentru o persoană: pronumele și forma (noi am vorbit); `undefined` dacă lipsesc formele. */
export function romanianPrompt(verb: RoVerb, tense: Tense, personIndex: number): string | undefined {
  const form = romanianForms(verb, tense)?.[personIndex];
  const pronoun = personsOf(tense)[personIndex]?.ro;
  return form && pronoun ? `${pronoun} ${form}` : undefined;
}
