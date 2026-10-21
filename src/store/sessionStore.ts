import { create } from "zustand";
import type { SessionItem } from "../domain/session/buildDailySession.ts";

/** Starea sesiunii de studiu curente (nu se persistă; progresul stă în Dexie). */
interface SessionState {
  queue: SessionItem[];
  index: number;
  flipped: boolean;
  answered: number;
  /** Momentul în care a fost afișat cardul curent (pentru durata răspunsului). */
  shownAt: number;
  start: (queue: SessionItem[]) => void;
  flip: () => void;
  /** Trece la cardul următor; opțional reintroduce un card la sfârșitul cozii. */
  advance: (requeue?: SessionItem) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  queue: [],
  index: 0,
  flipped: false,
  answered: 0,
  shownAt: 0,
  start: (queue) => set({ queue, index: 0, flipped: false, answered: 0, shownAt: Date.now() }),
  flip: () => set({ flipped: true }),
  advance: (requeue) =>
    set((s) => ({
      queue: requeue ? [...s.queue, requeue] : s.queue,
      index: s.index + 1,
      flipped: false,
      answered: s.answered + 1,
      shownAt: Date.now(),
    })),
  reset: () => set({ queue: [], index: 0, flipped: false, answered: 0, shownAt: 0 }),
}));
