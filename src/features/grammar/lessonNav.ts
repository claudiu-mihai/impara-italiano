/** De unde s-a deschis lecția (fișa cuvântului, conjugare): eticheta și adresa butonului „Înapoi”. */
export interface LessonOrigin {
  path: string;
  label: string;
}

/**
 * Starea de navigare purtată de la ecranul de plecare prin lecție și jocuri: `depth` = câți pași în istoric s-au
 * făcut de la ecranul de plecare, ca „Înapoi” din lecție să se întoarcă exact acolo (fără intrări noi în istoric).
 */
export interface LessonNavState {
  from: LessonOrigin;
  depth: number;
}

export function readLessonNav(state: unknown): LessonNavState | undefined {
  const nav = (state as { lessonNav?: LessonNavState } | null)?.lessonNav;
  return nav && typeof nav.depth === "number" && typeof nav.from?.path === "string" ? nav : undefined;
}

/** Starea pentru linkul următor (un pas mai departe de ecranul de plecare), sau `undefined` fără ecran de plecare. */
export function nextLessonNav(nav: LessonNavState | undefined): { lessonNav: LessonNavState } | undefined {
  return nav ? { lessonNav: { from: nav.from, depth: nav.depth + 1 } } : undefined;
}

export function lessonNavFrom(from: LessonOrigin): { lessonNav: LessonNavState } {
  return { lessonNav: { from, depth: 1 } };
}
