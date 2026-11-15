import type { ReactNode } from "react";
import { romanianPrompt, type RoVerb } from "../../domain/conjugation/romanian.ts";
import { NATIVE_LANGUAGE } from "../../domain/content/constants.ts";
import { personsOf, TENSE_LABEL } from "../../domain/content/display.ts";
import type { CoreWord } from "../../domain/content/types.ts";
import type { ConjItem } from "../../domain/session/buildConjugationSession.ts";
import { useT } from "../../i18n/index.ts";
import { AudioButton } from "../../ui/AudioButton.tsx";

interface ConjPromptProps {
  item: ConjItem;
  verb: CoreWord;
  ro?: RoVerb;
  person: number;
  rate: number;
  className: string;
  testId?: string;
  children?: ReactNode;
}

/**
 * Cerința unui card de conjugare. Cu forme românești, întâi sensul („noi am vorbit”), apoi verbul și persoana italiană;
 * fără ele (verbe din afara listei de conjugare activă), ca înainte: verbul, traducerea lui și persoana.
 */
export function ConjPrompt({ item, verb, ro, person, rate, className, testId, children }: ConjPromptProps) {
  const { t } = useT();
  const personLabel = personsOf(item.tense)[person]!;
  const prompt = ro && romanianPrompt(ro, item.tense, person);

  return (
    <section className={className} data-testid={testId}>
      <p className="text-sm text-muted">{t(TENSE_LABEL[item.tense])}</p>
      {prompt ? (
        <>
          <p lang={NATIVE_LANGUAGE} className="text-3xl font-bold compact:text-2xl" data-testid="ro-prompt">
            {prompt}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 compact:mt-0.5">
            <span lang="it" className="text-lg text-muted">
              {verb.it}
            </span>
            <AudioButton text={verb.it} rate={rate} size="sm" />
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
            <span lang="it" className="text-2xl font-bold text-brand-fg compact:text-xl" data-testid="person">
              {personLabel.it}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold compact:text-2xl">{verb.it}</p>
            <AudioButton text={verb.it} rate={rate} size="sm" />
          </div>
          <p lang={NATIVE_LANGUAGE} className="text-muted">
            {verb.ro}
          </p>
          <p className="mt-3 text-4xl font-bold text-brand-fg compact:mt-1 compact:text-3xl" data-testid="person">
            {personLabel.it}
          </p>
          {personLabel.ro !== personLabel.it && (
            <p lang={NATIVE_LANGUAGE} className="text-sm text-muted">
              ({personLabel.ro})
            </p>
          )}
        </>
      )}
      {children}
    </section>
  );
}
