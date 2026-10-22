import { reflexiveBase } from "../../src/domain/content/reflexive.ts";
import type { Conjugations, ParsedVerb } from "../../src/domain/content/schema.ts";
import {
  condizionale,
  congiuntivoRegular,
  contractedParticiple,
  futuro,
  futureStem,
  imperativo,
  imperfetto,
  isContracted,
  passatoProssimo,
  presenteRegular,
  reflexivize,
  regularParticiple,
} from "./rules.ts";

/** O formă sau mai multe forme acceptate (ex. congiuntivo „debba” / „deva”). */
type FormOrForms = string | string[];

export interface IrregularFile {
  /** Presente neregulat: cele 6 forme, scrise explicit. */
  presente: Record<string, string[]>;
  /** Imperfetto cu forme proprii (doar essere). */
  imperfetto?: Record<string, string[]>;
  /** Temă specială pentru imperfetto (fare → „face” → facevo). */
  imperfettoStem?: Record<string, string>;
  /** Temă specială pentru futuro și condizionale (andare → „andr” → andrò, andrei). */
  futuroStem?: Record<string, string>;
  /** Congiuntivo presente neregulat: 6 poziții, fiecare cu una sau mai multe forme. */
  congiuntivo?: Record<string, FormOrForms[]>;
  /** Imperativ neregulat: 5 poziții (tu, Lei, noi, voi, Loro), fiecare cu una sau mai multe forme. */
  imperativo?: Record<string, FormOrForms[]>;
  /** Verbe fără imperativ (potere, dovere): timpul nu se generează. */
  noImperativo?: string[];
}

/**
 * Generează conjugările (presente + passato prossimo) pentru toate verbele.
 * Presente vine din `irregular.json` dacă verbul e acolo, altfel din reguli.
 * Verifică și coerența dintre câmpul `irregular` al verbului și datele generate.
 */
export function buildConjugations(
  verbs: ParsedVerb[],
  irregular: IrregularFile,
): { conjugations: Conjugations; errors: string[]; explicitCount: number } {
  const errors: string[] = [];
  const byId = new Map(verbs.map((v) => [v.id, v]));

  const sections = [
    ["imperfetto", irregular.imperfetto],
    ["congiuntivo", irregular.congiuntivo],
  ] as const;
  for (const [tense, entries] of sections) {
    for (const [id, forms] of Object.entries(entries ?? {})) {
      if (!byId.has(id)) errors.push(`${id}: ${tense} neregulat pentru un verb care nu există`);
      if (forms.length !== 6) errors.push(`${id}: ${tense} neregulat trebuie să aibă 6 poziții`);
    }
  }
  for (const [id, forms] of Object.entries(irregular.imperativo ?? {})) {
    if (!byId.has(id)) errors.push(`${id}: imperativ neregulat pentru un verb care nu există`);
    if (forms.length !== 5) errors.push(`${id}: imperativ neregulat trebuie să aibă 5 poziții (tu, Lei, noi, voi, Loro)`);
  }
  for (const id of irregular.noImperativo ?? []) {
    if (!byId.has(id)) errors.push(`${id}: „noImperativo” pentru un verb care nu există`);
  }
  for (const id of [...Object.keys(irregular.imperfettoStem ?? {}), ...Object.keys(irregular.futuroStem ?? {})]) {
    if (!byId.has(id)) errors.push(`${id}: temă neregulată pentru un verb care nu există`);
  }

  for (const [id, forms] of Object.entries(irregular.presente)) {
    if (!byId.has(id)) errors.push(`${id}: există în irregular.json, dar nu în lista de verbe`);
    if (forms.length !== 6 || forms.some((f) => !f.trim())) {
      errors.push(`${id}: presente neregulat trebuie să aibă 6 forme nenule`);
    }
  }

  const conjugations: Conjugations = {};
  let explicitCount = 0;

  for (const verb of verbs) {
    const explicit = irregular.presente[verb.id];
    // verbele reflexive se conjugă ca verbul de bază (svegliarsi → svegliare); pronumele se adaugă la final
    const infinitive = verb.reflexive ? reflexiveBase(verb.it) : verb.it;

    // verbele în -rre (porre, trarre, condurre…) se conjugă după familia lor; sunt mereu neregulate, din grupa -ere
    if (isContracted(infinitive)) {
      let expected: string;
      try {
        expected = contractedParticiple(infinitive);
      } catch (error) {
        errors.push(`${verb.id}: ${(error as Error).message}`);
        continue;
      }
      if (verb.group !== "ere") errors.push(`${verb.id}: verbele în -rre sunt din grupa "ere", nu "${verb.group}"`);
      if (!verb.irregular) errors.push(`${verb.id}: verbele în -rre sunt mereu neregulate`);
      if (verb.pastParticiple !== expected) errors.push(`${verb.id}: participiul "${verb.pastParticiple}" ≠ "${expected}" (familia verbului)`);
    }
    const regularPart = regularParticiple(infinitive, verb.group);

    if (!verb.irregular && explicit) {
      errors.push(`${verb.id}: marcat regulat, dar are presente neregulat în irregular.json`);
    }
    if (!verb.irregular && verb.pastParticiple !== regularPart) {
      errors.push(`${verb.id}: marcat regulat, dar participiul "${verb.pastParticiple}" ≠ "${regularPart}"`);
    }
    // o excepție poate fi în oricare secțiune (cadere: doar tema de viitor cadr-)
    const hasException =
      !!explicit ||
      verb.id in (irregular.imperfetto ?? {}) ||
      verb.id in (irregular.imperfettoStem ?? {}) ||
      verb.id in (irregular.futuroStem ?? {}) ||
      verb.id in (irregular.congiuntivo ?? {}) ||
      verb.id in (irregular.imperativo ?? {});
    if (verb.irregular && !hasException && verb.pastParticiple === regularPart) {
      errors.push(`${verb.id}: marcat neregulat, dar nu are nicio excepție și are participiu regulat`);
    }

    if (explicit) explicitCount++;
    const single = (forms: string[]) => forms.map((form) => [form]);
    const presente = single(explicit ?? presenteRegular(infinitive, verb.group));

    const stem = irregular.futuroStem?.[verb.id] ?? futureStem(infinitive, verb.group);
    const explicitCongiuntivo = irregular.congiuntivo?.[verb.id];

    const congiuntivo = explicitCongiuntivo
      ? explicitCongiuntivo.map((forms) => (Array.isArray(forms) ? forms : [forms]))
      : single(congiuntivoRegular(infinitive, verb.group));
    const explicitImperativo = irregular.imperativo?.[verb.id];
    const hasImperativo = !irregular.noImperativo?.includes(verb.id);

    const bare: Conjugations[string] = {
      presente,
      passatoProssimo: passatoProssimo(verb),
      imperfetto: single(irregular.imperfetto?.[verb.id] ?? imperfetto(infinitive, irregular.imperfettoStem?.[verb.id])),
      futuro: single(futuro(stem)),
      condizionale: single(condizionale(stem)),
      congiuntivo,
      ...(hasImperativo && {
        imperativo: explicitImperativo
          ? explicitImperativo.map((forms) => (Array.isArray(forms) ? forms : [forms]))
          : single(
              imperativo(
                verb.group,
                presente.map((forms) => forms[0]!),
                congiuntivo.map((forms) => forms[0]!),
              ),
            ),
      }),
    };
    conjugations[verb.id] = verb.reflexive
      ? (Object.fromEntries(Object.entries(bare).map(([tense, forms]) => [tense, reflexivize(tense, forms)])) as Conjugations[string])
      : bare;
  }

  return { conjugations, errors, explicitCount };
}
