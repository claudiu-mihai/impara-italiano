import { useEffect, useState, type RefObject } from "react";

/** Cât din card trebuie să se vadă ca să fie cel activ. */
export const ACTIVE_RATIO = 0.6;

/**
 * Indexul cardului vizibil în proporție de cel puțin `ACTIVE_RATIO` în `container` (copiii lui sunt cardurile). Se
 * reabonează când se schimbă numărul de carduri (`count`), ca să prindă și cardurile adăugate.
 */
export function useActiveCard(container: RefObject<HTMLElement | null>, count: number): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= ACTIVE_RATIO) {
            setActive(Array.prototype.indexOf.call(root.children, entry.target));
          }
        }
      },
      { root, threshold: [ACTIVE_RATIO] },
    );
    for (const child of Array.from(root.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [container, count]);
  return active;
}
