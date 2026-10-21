/** La câte repetiții se intercalează un card nou. */
export const REVIEWS_PER_NEW = 4;

/** Repetiții cu câte un card nou intercalat la fiecare REVIEWS_PER_NEW repetiții. */
export function interleave<T>(reviews: readonly T[], fresh: readonly T[]): T[] {
  const queue: T[] = [];
  let r = 0;
  let n = 0;
  while (r < reviews.length || n < fresh.length) {
    for (let k = 0; k < REVIEWS_PER_NEW && r < reviews.length; k++) queue.push(reviews[r++]!);
    if (n < fresh.length) queue.push(fresh[n++]!);
  }
  return queue;
}
