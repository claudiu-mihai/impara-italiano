import { useEffect, useState } from "react";

export interface VisibleViewport {
  /** Marginea de sus a zonei vizibile, față de pagină (iOS derulează pagina când apare tastatura). */
  top: number;
  /** Înălțimea zonei vizibile: fără tastatura de pe ecran, când e deschisă. */
  height: number;
}

/** Sub această înălțime a zonei vizibile ecranele de studiu trec în aspectul compact. */
export const COMPACT_BELOW = 560;

const read = (): VisibleViewport | undefined => {
  const viewport = window.visualViewport;
  return viewport ? { top: Math.round(viewport.offsetTop), height: Math.round(viewport.height) } : undefined;
};

/**
 * Zona vizibilă a ferestrei, urmărind tastatura de pe ecran (`window.visualViewport`); `undefined` cât timp
 * `enabled` e fals sau browserul nu are `visualViewport`.
 */
export function useVisibleViewport(enabled: boolean): VisibleViewport | undefined {
  const [viewport, setViewport] = useState(read);

  useEffect(() => {
    const source = window.visualViewport;
    if (!enabled || !source) return;
    const update = () =>
      setViewport((current) => {
        const next = read();
        return current && next && current.top === next.top && current.height === next.height ? current : next;
      });
    update();
    source.addEventListener("resize", update);
    source.addEventListener("scroll", update);
    return () => {
      source.removeEventListener("resize", update);
      source.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return enabled ? viewport : undefined;
}
