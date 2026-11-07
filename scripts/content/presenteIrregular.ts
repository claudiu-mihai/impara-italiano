import { presenteRegular, type Group } from "../conjugate/rules.ts";

/** „ii” și „i” se pronunță la fel: avvii / avvi, compiiamo / compiamo diferă doar la scris. */
const spoken = (forms: readonly string[]) => forms.map((f) => f.replaceAll("ii", "i")).join(",");

/**
 * Verbele neregulate la prezent, pentru lecția „Verbe neregulate frecvente”: cele din irregular.json ale căror forme
 * diferă de regulă. Diferențele doar de scriere (un „i” în plus) și formele identice cu regula nu contează.
 */
export function irregularPresenteIds(
  presente: Readonly<Record<string, readonly string[]>>,
  verbs: readonly { id: string; it: string; group: Group }[],
): string[] {
  const byId = new Map(verbs.map((v) => [v.id, v]));
  return Object.entries(presente)
    .filter(([id, forms]) => {
      const verb = byId.get(id);
      return !verb || spoken(forms) !== spoken(presenteRegular(verb.it, verb.group));
    })
    .map(([id]) => id)
    .sort();
}
