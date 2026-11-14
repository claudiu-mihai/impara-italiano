/** De unde s-a deschis pagina cuvântului (ex. o temă): eticheta și adresa butonului „Înapoi” de sus. */
export interface WordOrigin {
  path: string;
  label: string;
}

/** Starea de navigare de pus pe linkul către pagina cuvântului, ca „Înapoi” să se întoarcă la pagina de plecare, nu în Dicționar. */
export function wordOriginState(from: WordOrigin): { wordFrom: WordOrigin } {
  return { wordFrom: from };
}

/** Originea din starea de navigare, sau `undefined` (adresă deschisă direct, link din Dicționar) → „Înapoi” merge în Dicționar. */
export function readWordOrigin(state: unknown): WordOrigin | undefined {
  const from = (state as { wordFrom?: Partial<WordOrigin> } | null)?.wordFrom;
  // doar adrese din aplicație (încep cu un singur „/”), niciodată un link extern
  if (typeof from?.path !== "string" || typeof from.label !== "string") return undefined;
  return from.path.startsWith("/") && !from.path.startsWith("//") ? { path: from.path, label: from.label } : undefined;
}
