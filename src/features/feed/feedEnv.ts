import { createContext, useContext, useEffect, useRef } from "react";
import type { FeedSources } from "../../domain/feed/buildFeedBatch.ts";
import type { SentenceItem } from "../../domain/sentence/sentenceRound.ts";
import type { Settings } from "../../domain/settings.ts";

/** Ce au nevoie cardurile de la ecranul Flux: setările, conținutul și dacă au voie să se audă singure. */
export interface FeedEnv {
  settings: Settings;
  sources: FeedSources;
  sentenceById: ReadonlyMap<string, SentenceItem>;
  /** Redarea automată: după atingerea de start, cu „Audio automat” pornit și fără 🔇. */
  autoplay: boolean;
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
