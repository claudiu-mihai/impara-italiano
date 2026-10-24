export interface Greeting {
  /** Salutul, în italiană. */
  it: string;
  /** Traducerea în română. */
  ro: string;
}

/**
 * Salutul italian potrivit orei locale. Noaptea nu e „Buonanotte”: italienii îl spun doar la despărțire, când merg
 * la culcare, nu ca salut.
 */
export function greetingFor(date: Date): Greeting {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { it: "Buongiorno!", ro: "Bună dimineața!" };
  if (hour >= 12 && hour < 17) return { it: "Buon pomeriggio!", ro: "Bună ziua!" };
  if (hour >= 17 && hour < 23) return { it: "Buonasera!", ro: "Bună seara!" };
  return { it: "Ciao! Non dormi?", ro: "Salut! Nu dormi?" };
}
