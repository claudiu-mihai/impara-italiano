/** Infinitivul verbului de bază al unui verb reflexiv (svegliarsi → svegliare, mettersi → mettere). */
export function reflexiveBase(infinitive: string): string {
  return `${infinitive.slice(0, -2)}e`;
}

/** Verbul reflexiv: infinitivul se termină în -arsi, -ersi sau -irsi. */
export const isReflexiveInfinitive = (infinitive: string): boolean => /(ar|er|ir)si$/.test(infinitive);

/** Lema după care se caută frecvența: verbul de bază pentru reflexive. */
export const lemmaOf = (word: { it: string; pos: string; reflexive?: boolean }): string =>
  word.pos === "verb" && word.reflexive ? reflexiveBase(word.it) : word.it;
