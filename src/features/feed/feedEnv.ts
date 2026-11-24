import { createContext, useContext, useEffect, useRef } from "react";
import type { Grade } from "ts-fsrs";
import type { FeedSources } from "../../domain/feed/buildFeedBatch.ts";
import type { FeedGridQuestion } from "../../domain/feed/types.ts";
import type { SessionItem } from "../../domain/session/buildDailySession.ts";
import type { StoredCard } from "../../domain/srs/types.ts";
import type { SentenceItem } from "../../domain/sentence/sentenceRound.ts";
import type { Settings } from "../../domain/settings.ts";

/** Ce au nevoie cardurile de la ecranul Flux: setările, conținutul și dacă au voie să se audă singure. */
export interface FeedEnv {
  settings: Settings;
  sources: FeedSources;
  sentenceById: ReadonlyMap<string, SentenceItem>;
  /** Redarea automată: după atingerea de start, cu „Audio automat” pornit și fără 🔇. */
  autoplay: boolean;
  /** Notează o repetiție sau un cuvânt nou; `undefined` dacă același card se notează chiar acum. */
  rate: (item: SessionItem, grade: Grade, shownAt: number) => Promise<StoredCard | undefined>;
  /** După ce un card „review” sau „newWord” a fost notat: progresul zilei și testul de după cuvântul nou. */
  afterRating: (cardKey: string, session: SessionItem, isNew: boolean) => void;
  /** Notează grila de după un cuvânt nou; întoarce dacă a notat (altfel e exersare liberă). */
  gradeFollowUp: (question: FeedGridQuestion, correct: boolean, shownAt: number) => Promise<boolean>;
  /** Un test a primit răspuns: combo, sunet, vibrație, reacția lui Lupino. */
  reportAnswer: (correct: boolean) => void;
  /** Testul unui item din pachet a primit răspuns. */
  markQuizzed: (packId: string) => void;
}

export const FeedEnvContext = createContext<FeedEnv | undefined>(undefined);

export function useFeedEnv(): FeedEnv {
  const env = useContext(FeedEnvContext);
  if (!env) throw new Error("useFeedEnv trebuie folosit în interiorul ecranului Flux");
  return env;
}

/**
 * Cardul activ își redă sunetul o singură dată, când devine activ (sau când pornește redarea automată). Oprirea sunetului
 * la schimbarea cardului o face ecranul, înaintea efectelor cardurilor.
 */
export function useAutoSpeak(active: boolean, play: () => void): void {
  const { autoplay } = useFeedEnv();
  const latest = useRef(play);
  latest.current = play;
  useEffect(() => {
    if (active && autoplay) latest.current();
  }, [active, autoplay]);
}
