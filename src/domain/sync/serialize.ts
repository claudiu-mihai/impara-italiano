import type { ReviewLogEntry, StoredCard } from "../srs/types.ts";

/**
 * Forma în care cardurile și jurnalul ajung pe server (câmpul JSON `data`). Datele sunt JSON simplu,
 * deci `Date` devine șir ISO la scriere (`toJSON`) și se readuce la `Date` la citire.
 * Câmpurile de sincronizare (`updatedAt`, `uid`) stau separat, ca coloane ale înregistrării.
 */

// `dirty` este un marcaj local (rândul așteaptă trimiterea) și nu pleacă niciodată pe server
export function cardToData(card: StoredCard & { dirty?: unknown }): Record<string, unknown> {
  const { updatedAt: _updatedAt, dirty: _dirty, ...rest } = card;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
}

export function logToData(entry: ReviewLogEntry & { dirty?: unknown }): Record<string, unknown> {
  const { id: _id, uid: _uid, dirty: _dirty, ...rest } = entry;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
}

/** Un identificator unic pentru o intrare nouă; folosește UUID când browserul îl oferă (doar în context securizat). */
export function newUid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}
