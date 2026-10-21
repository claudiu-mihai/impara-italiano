export type Group = "are" | "ere" | "ire" | "isc";
export type Auxiliary = "avere" | "essere" | "both";

export interface VerbEntry {
  id: string;
  it: string;
  group: Group;
  auxiliary: Auxiliary;
  pastParticiple: string;
  irregular: boolean;
  reflexive: boolean;
}

// Pentru fiecare persoană (io, tu, lui/lei, noi, voi, loro): lista formelor acceptate.
export type PersonForms = string[][];

const AUX_AVERE = ["ho", "hai", "ha", "abbiamo", "avete", "hanno"];
const AUX_ESSERE = ["sono", "sei", "è", "siamo", "siete", "sono"];

/** Presente indicativo al unui verb regulat, din infinitiv și grupă. */
export function presenteRegular(infinitive: string, group: Group): string[] {
  const stem = infinitive.slice(0, -3);

  switch (group) {
    case "are": {
      // Se presupune i neaccentuat (mangiare, lasciare, cominciare).
      const endsInI = stem.endsWith("i");
      // -care / -gare păstrează sunetul tare: gioco, giochi, giochiamo.
      const hard = stem.endsWith("c") || stem.endsWith("g");
      const tu = endsInI ? stem : hard ? `${stem}hi` : `${stem}i`;
      const noi = endsInI ? `${stem}amo` : hard ? `${stem}hiamo` : `${stem}iamo`;
      return [`${stem}o`, tu, `${stem}a`, noi, `${stem}ate`, `${stem}ano`];
    }
    case "ere":
      return [`${stem}o`, `${stem}i`, `${stem}e`, `${stem}iamo`, `${stem}ete`, `${stem}ono`];
    case "ire":
      return [`${stem}o`, `${stem}i`, `${stem}e`, `${stem}iamo`, `${stem}ite`, `${stem}ono`];
    case "isc":
      return [
        `${stem}isco`,
        `${stem}isci`,
        `${stem}isce`,
        `${stem}iamo`,
        `${stem}ite`,
        `${stem}iscono`,
      ];
  }
}

/** Participiul trecut regulat (parlare → parlato). */
export function regularParticiple(infinitive: string, group: Group): string {
  const stem = infinitive.slice(0, -3);
  return stem + (group === "are" ? "ato" : group === "ere" ? "uto" : "ito");
}

/**
 * Passato prossimo: auxiliar + participiu.
 * Cu essere, participiul se acordă (andato/andata, andati/andate).
 * Verbele cu auxiliar "both" acceptă ambele serii; seria cu avere apare prima.
 */
export function passatoProssimo(verb: VerbEntry): PersonForms {
  const p = verb.pastParticiple;
  if (!p.endsWith("o")) {
    throw new Error(`${verb.id}: participiul "${p}" nu se termină în -o, acordul nu poate fi generat`);
  }
  const base = p.slice(0, -1);

  const withAvere = (i: number) => [`${AUX_AVERE[i]} ${p}`];
  const withEssere = (i: number) =>
    i < 3
      ? [`${AUX_ESSERE[i]} ${base}o`, `${AUX_ESSERE[i]} ${base}a`]
      : [`${AUX_ESSERE[i]} ${base}i`, `${AUX_ESSERE[i]} ${base}e`];

  return AUX_AVERE.map((_, i) => {
    switch (verb.auxiliary) {
      case "avere":
        return withAvere(i);
      case "essere":
        return withEssere(i);
      case "both":
        return [...withAvere(i), ...withEssere(i)];
    }
  });
}

// ---------------------------------------------------------------------------
// Imperfetto, futuro semplice, condizionale presente, congiuntivo presente
// ---------------------------------------------------------------------------

/** Infinitivul fără terminația -are / -ere / -ire. */
const stemOf = (infinitive: string) => infinitive.slice(0, -3);

const IMPERFETTO_ENDINGS = ["vo", "vi", "va", "vamo", "vate", "vano"];

/**
 * Imperfetto: tema infinitivului (fără „-re”) + terminațiile -vo, -vi, -va, -vamo, -vate, -vano
 * (parlare → parlavo). `irregularStem` acoperă temele speciale: fare → „face” (facevo).
 */
export function imperfetto(infinitive: string, irregularStem?: string): string[] {
  const stem = irregularStem ?? infinitive.slice(0, -2);
  return IMPERFETTO_ENDINGS.map((ending) => `${stem}${ending}`);
}

/** Tema de viitor / condițional dintr-un infinitiv regulat (parlare → parler, sentire → sentir). */
export function futureStem(infinitive: string, group: Group): string {
  const stem = stemOf(infinitive);
  if (group === "are") {
    // -care / -gare păstrează sunetul tare (giocherò); -ciare / -giare pierd „i” (mangerò, comincerò).
    if (stem.endsWith("c") || stem.endsWith("g")) return `${stem}her`;
    // „i” dispare doar dacă e semn grafic după c, g, sc (mangiare → mangerò); altfel rămâne (iniziare → inizierò)
    if (/(c|g|sc)i$/.test(stem)) return `${stem.slice(0, -1)}er`;
    return `${stem}er`;
  }
  return `${stem}${group === "ere" ? "er" : "ir"}`;
}

const FUTURO_ENDINGS = ["ò", "ai", "à", "emo", "ete", "anno"];
const CONDIZIONALE_ENDINGS = ["ei", "esti", "ebbe", "emmo", "este", "ebbero"];

/** Futuro semplice și condizionale presente din aceeași temă (parler- → parlerò / parlerei). */
export function futuro(stem: string): string[] {
  return FUTURO_ENDINGS.map((ending) => `${stem}${ending}`);
}

export function condizionale(stem: string): string[] {
  return CONDIZIONALE_ENDINGS.map((ending) => `${stem}${ending}`);
}

/**
 * Congiuntivo presente regulat. La io, tu și lui/lei forma este aceeași (che io parli, che tu parli, che lui parli).
 * -are: parli … parliamo, parliate, parlino; -ere/-ire: creda … crediamo, crediate, credano.
 */
export function congiuntivoRegular(infinitive: string, group: Group): string[] {
  const stem = stemOf(infinitive);

  if (group === "are") {
    const endsInI = stem.endsWith("i");
    const hard = stem.endsWith("c") || stem.endsWith("g");
    const single = endsInI ? stem : hard ? `${stem}hi` : `${stem}i`;
    const noi = endsInI ? `${stem}amo` : hard ? `${stem}hiamo` : `${stem}iamo`;
    const voi = endsInI ? `${stem}ate` : hard ? `${stem}hiate` : `${stem}iate`;
    const loro = endsInI ? `${stem}no` : hard ? `${stem}hino` : `${stem}ino`;
    return [single, single, single, noi, voi, loro];
  }

  const single = group === "isc" ? `${stem}isca` : group === "ere" ? `${stem}a` : `${stem}a`;
  const loro = group === "isc" ? `${stem}iscano` : `${stem}ano`;
  return [single, single, single, `${stem}iamo`, `${stem}iate`, loro];
}

/**
 * Imperativ afirmativ, 5 persoane: tu, Lei, noi, voi, Loro (nu există persoana I singular).
 * - tu: la -are forma de persoana a III-a a prezentului (parla!), la -ere/-ire forma de persoana a II-a (credi!, dormi!, finisci!);
 * - Lei și Loro iau formele de congiuntivo (parli, parlino);
 * - noi și voi coincid cu prezentul (parliamo, parlate).
 */
export function imperativo(group: Group, presente: string[], congiuntivo: string[]): string[] {
  const tu = group === "are" ? presente[2]! : presente[1]!;
  return [tu, congiuntivo[2]!, presente[3]!, presente[4]!, congiuntivo[5]!];
}

const REFLEXIVE_PRONOUNS = ["mi", "ti", "si", "ci", "vi", "si"];

/**
 * Formele unui verb reflexiv din formele verbului de bază (fiecare timp are aceeași structură).
 * - timpurile cu 6 persoane: pronumele stă înaintea formei (mi sveglio, ti sei svegliato);
 * - imperativul: tu, noi și voi cu pronumele lipit la sfârșit (alzati, alziamoci, alzatevi), Lei și Loro cu „si” înainte (si alzi).
 */
export function reflexivize(tense: string, forms: PersonForms): PersonForms {
  if (tense === "imperativo") {
    const wrap: ((form: string) => string)[] = [
      (f) => `${f}ti`,
      (f) => `si ${f}`,
      (f) => `${f}ci`,
      (f) => `${f}vi`,
      (f) => `si ${f}`,
    ];
    return forms.map((alternatives, i) => alternatives.map((form) => wrap[i]!(form)));
  }
  return forms.map((alternatives, i) => alternatives.map((form) => `${REFLEXIVE_PRONOUNS[i]} ${form}`));
}
