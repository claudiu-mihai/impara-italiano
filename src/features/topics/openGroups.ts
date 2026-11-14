import { TOPIC_GROUPS, type TopicGroup } from "../../domain/content/constants.ts";

/** Cheia din `localStorage` cu categoriile de teme lăsate deschise (comoditate pe dispozitiv, nu progres). */
export const OPEN_GROUPS_KEY = "impara.topicGroups";

export function serializeOpenGroups(open: readonly TopicGroup[]): string {
  return JSON.stringify(open);
}

/** Categoriile deschise din valoarea salvată; orice altceva (lipsă, JSON stricat, nume necunoscute) înseamnă „toate închise”. */
export function parseOpenGroups(raw: string | null): TopicGroup[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return TOPIC_GROUPS.filter((g) => parsed.includes(g));
  } catch {
    return [];
  }
}

export function loadOpenGroups(): TopicGroup[] {
  try {
    return parseOpenGroups(localStorage.getItem(OPEN_GROUPS_KEY));
  } catch {
    return [];
  }
}

export function saveOpenGroups(open: readonly TopicGroup[]): void {
  try {
    localStorage.setItem(OPEN_GROUPS_KEY, serializeOpenGroups(open));
  } catch {
    // fără stocare (mod privat, date blocate) pagina funcționează la fel, doar nu ține minte
  }
}
