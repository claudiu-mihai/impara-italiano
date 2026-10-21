const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pozițiile în `it` unde `gap` apare ca cuvânt întreg (articolele cu apostrof, ca „l'”, se lipesc de cuvântul următor). */
export function gapPositions(it: string, gap: string): number[] {
  const end = gap.endsWith("'") ? "" : "(?=[\\s.,!?]|$)";
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(gap)}${end}`, "gu");
  return [...it.matchAll(pattern)].map((m) => m.index + m[1]!.length);
}

/** Textul de dinainte și de după lacună; `undefined` dacă lacuna nu apare exact o dată. */
export function splitAtGap(it: string, gap: string): { before: string; after: string } | undefined {
  const positions = gapPositions(it, gap);
  if (positions.length !== 1) return undefined;
  const at = positions[0]!;
  return { before: it.slice(0, at), after: it.slice(at + gap.length) };
}
