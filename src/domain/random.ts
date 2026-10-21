/** Sursă de numere aleatorii în [0, 1); injectabilă în teste pentru rezultate deterministe. */
export type Random = () => number;

/** Amestecă o copie a listei (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
