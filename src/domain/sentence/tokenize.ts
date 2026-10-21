export interface TokenizedSentence {
  /** Blocurile propoziției, fără punctuația finală; primul cuvânt este scris cu literă mică. */
  tokens: string[];
  /** Punctuația finală (".", "?", "!"), fixă și nefăcând parte din blocuri. */
  punctuation: string;
}

const lowerFirst = (word: string) => (word ? word[0]!.toLowerCase() + word.slice(1) : word);

/** Desparte o propoziție în blocuri pentru exercițiul de reconstruire. */
export function tokenizeSentence(text: string): TokenizedSentence {
  const trimmed = text.trim();
  const punctuation = trimmed.match(/[.!?…]+$/)?.[0] ?? "";
  const body = punctuation ? trimmed.slice(0, -punctuation.length) : trimmed;
  const tokens = body.split(/\s+/).filter(Boolean);
  if (tokens.length > 0) tokens[0] = lowerFirst(tokens[0]!);
  return { tokens, punctuation };
}

export interface AcceptedOrdersResult {
  orders: number[][];
  errors: string[];
}

/**
 * Transformă variantele acceptate (propoziții întregi) în ordini de indici peste blocurile propoziției de bază.
 * O variantă trebuie să conțină exact aceleași blocuri, într-o altă ordine.
 */
export function acceptedOrders(base: string, variants: readonly string[]): AcceptedOrdersResult {
  const { tokens, punctuation } = tokenizeSentence(base);
  const identity = tokens.map((_, i) => i);
  const orders = [identity];
  const errors: string[] = [];

  for (const variant of variants) {
    const parsed = tokenizeSentence(variant);
    if (parsed.punctuation !== punctuation) {
      errors.push(`varianta „${variant}” are altă punctuație decât „${base}”`);
      continue;
    }
    const used = new Set<number>();
    const order: number[] = [];
    for (const token of parsed.tokens) {
      const index = tokens.findIndex((t, i) => !used.has(i) && t.toLowerCase() === token.toLowerCase());
      if (index === -1) break;
      used.add(index);
      order.push(index);
    }
    if (order.length !== tokens.length || parsed.tokens.length !== tokens.length) {
      errors.push(`varianta „${variant}” nu conține exact aceleași cuvinte ca „${base}”`);
      continue;
    }
    if (!orders.some((o) => o.join(",") === order.join(","))) orders.push(order);
  }
  return { orders, errors };
}
