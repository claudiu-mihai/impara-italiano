import { useItalianFirst } from "../app/italianFirst.ts";
import { NATIVE_LANGUAGE } from "../domain/content/constants.ts";
import type { Localized } from "../domain/content/schema.ts";

/** Textul în limba maternă dintr-un text în două limbi. */
export const nativeText = (text: Localized): string => text[NATIVE_LANGUAGE];

/** Textul pentru etichete accesibile (aria-label): italiana și, între paranteze, limba maternă. */
export function plainLabel(text: Localized, italianFirst: boolean): string {
  return italianFirst ? `${text.it} (${nativeText(text)})` : nativeText(text);
}

/**
 * Un nume afișat conform setării „Italiană întâi”: pornită, italiana (`lang="it"`) și sub ea, mult mai mic,
 * limba maternă; oprită, doar limba maternă.
 */
export function BilingualLabel({ text }: { text: Localized }) {
  const italianFirst = useItalianFirst();
  if (!italianFirst) return <>{nativeText(text)}</>;
  return (
    <>
      <span lang="it">{text.it}</span>
      <span className="block text-xs font-normal normal-case tracking-normal text-muted">{nativeText(text)}</span>
    </>
  );
}
