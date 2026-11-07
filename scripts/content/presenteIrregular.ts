import { isContracted, presenteRegular, type Group } from "../conjugate/rules.ts";

/** „ii” și „i” se pronunță la fel: avvii / avvi, compiiamo / compiamo diferă doar la scris. */
const spoken = (forms: readonly string[]) => forms.map((f) => f.replaceAll("ii", "i")).join(",");

/**
 * Verbele neregulate la prezent, pentru lecția „Verbe neregulate frecvente”: cele din irregular.json ale căror forme
 * diferă de regulă, plus verbele contrase în -rre (porre, trarre, -durre), conjugate după tema latină și deci mereu
 * neregulate. Diferențele doar de scriere (un „i” în plus) și formele identice cu regula nu contează.
 */
export function irregularPresenteIds(
  presente: Readonly<Record<string, readonly string[]>>,
  verbs: readonly { id: string; it: string; group: Group }[],
): string[] {
  const byId = new Map(verbs.map((v) => [v.id, v]));
  const fromFile = Object.entries(presente)
    .filter(([id, forms]) => {
      const verb = byId.get(id);
      return !verb || spoken(forms) !== spoken(presenteRegular(verb.it, verb.group));
    })
    .map(([id]) => id);
  const contracted = verbs.filter((v) => isContracted(v.it)).map((v) => v.id);
  return [...new Set([...fromFile, ...contracted])].sort();
}
