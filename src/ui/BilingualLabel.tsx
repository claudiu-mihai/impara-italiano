import { useNativeHelp } from "../app/nativeHelp.ts";
import { NATIVE_LANGUAGE } from "../domain/content/constants.ts";
import type { Localized } from "../domain/content/schema.ts";

/** Textul în limba maternă dintr-un text în două limbi. */
export const nativeText = (text: Localized): string => text[NATIVE_LANGUAGE];

/** Textul pentru etichete accesibile (aria-label): italiana și, cu traducerea pornită, limba maternă între paranteze. */
export function plainLabel(text: Localized, nativeHelp: boolean): string {
  return nativeHelp ? `${text.it} (${nativeText(text)})` : text.it;
}

/**
 * Un nume în italiană (`lang="it"`); cu setarea „Traducere în limba maternă” pornită, sub el apare, mult mai mic,
 * traducerea, ca ajutor pentru începători.
 */
export function BilingualLabel({ text }: { text: Localized }) {
  const nativeHelp = useNativeHelp();
  if (!nativeHelp) return <span lang="it">{text.it}</span>;
  return (
    <>
      <span lang="it">{text.it}</span>
      <span className="block text-xs font-normal normal-case tracking-normal text-muted">{nativeText(text)}</span>
    </>
  );
}
