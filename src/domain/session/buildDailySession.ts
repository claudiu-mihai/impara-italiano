import { State } from "ts-fsrs";
import type { Level, Pos } from "../content/constants.ts";
import { isUpTo } from "../content/levels.ts";
import { endOfStudyDay, studyDayOf } from "../time/studyDay.ts";
import type { StudyDirection } from "../settings.ts";
import type { Direction, StoredCard } from "../srs/types.ts";
import { vocabCardId } from "../srs/types.ts";
import { interleave } from "./interleave.ts";
import { orderNewWords } from "./orderNewWords.ts";

/**
 * În modul „ambele”: cardul celeilalte direcții al unui cuvânt se deblochează când cardul existent are cel puțin atâta
 * stabilitate (zile), adică întâi îl recunoști sigur (IT → RO), apoi îl exersezi și ca producție (RO → IT).
 */
export const REVERSE_UNLOCK_STABILITY_DAYS = 7;

/** Cardurile aflate în (re)învățare apar în sesiune cu cel mult atât înainte de scadență. */
export const LEARN_AHEAD_MS = 20 * 60 * 1000;

export interface SessionSettings {
  /** Cuvinte noi se introduc doar până la acest nivel. */
  level: Level;
  newPerDay: number;
  maxReviewsPerDay: number;
  direction: StudyDirection;
  /** În modul „ambele”: carduri din cealaltă direcție deblocate pe zi; lipsă = 0. */
  newReversePerDay?: number;
  /** Procentul de substantive printre cuvintele de conținut noi; lipsă sau 0 = doar după frecvență. */
  nounShare?: number;
}

export interface SessionItem {
  cardId: string;
  wordId: string;
  variant: Direction;
  isNew: boolean;
  /** Card nou din a doua direcție a unui cuvânt deja învățat (modul „ambele”). */
  reverse?: boolean;
}

const opposite = (direction: Direction): Direction => (direction === "it-ro" ? "ro-it" : "it-ro");

/** Direcțiile active și direcția în care se introduc cuvintele noi (în modul „ambele”: IT → RO, recunoașterea întâi). */
export function directionsOf(direction: StudyDirection): { active: Direction[]; forNewWords: Direction } {
  return direction === "both"
    ? { active: ["it-ro", "ro-it"], forNewWords: "it-ro" }
    : { active: [direction], forNewWords: direction };
}

/**
 * Cardurile celeilalte direcții care se pot debloca azi: cardul existent e în repetare, are stabilitatea de cel puțin
 * REVERSE_UNLOCK_STABILITY_DAYS și nu a fost repetat azi (altfel răspunsul ar fi încă proaspăt în minte).
 * Cele mai stabile primele: sunt cuvintele cele mai sigure.
 */
export function reverseCandidates(vocab: readonly StoredCard[], today: string): SessionItem[] {
  const present = new Set(vocab.map((c) => c.cardId));
  return vocab
    .filter(
      (c) =>
        c.state === State.Review &&
        c.stability >= REVERSE_UNLOCK_STABILITY_DAYS &&
        (!c.last_review || studyDayOf(c.last_review) !== today) &&
        !present.has(vocabCardId(c.wordId, opposite(c.variant as Direction))),
    )
    .sort((a, b) => b.stability - a.stability || a.wordId.localeCompare(b.wordId))
    .map((c): SessionItem => {
      const variant = opposite(c.variant as Direction);
      return { cardId: vocabCardId(c.wordId, variant), wordId: c.wordId, variant, isNew: true, reverse: true };
    });
}

/** Cele două direcții ale aceluiași cuvânt nu stau una după alta: a doua ar fi trivială. */
export function spreadSameWord<T extends { wordId: string }>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = 1; i < out.length; i++) {
    if (out[i]!.wordId !== out[i - 1]!.wordId) continue;
    const k = out.findIndex((x, j) => j > i && x.wordId !== out[i - 1]!.wordId);
    if (k > i) [out[i], out[k]] = [out[k]!, out[i]!];
  }
  return out;
}

/** Alternează două liste (a, b, a, b…); când una se termină, continuă cealaltă. */
function alternate<T>(a: readonly T[], b: readonly T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]!);
    if (i < b.length) out.push(b[i]!);
  }
  return out;
}

export interface BuildSessionArgs {
  now: Date;
  settings: SessionSettings;
  cards: StoredCard[];
  /** Cuvintele disponibile pentru introducere. */
  words: { id: string; rank: number; level: Level; pos: Pos }[];
  /** Repetiții deja făcute în ziua de studiu curentă. */
  reviewsDoneToday: number;
}

export function isDue(card: StoredCard, now: Date, endOfDay: Date): boolean {
  // Cardurile din faza de repetare se iau pe zile întregi; cele din (re)învățare, când vine ora lor.
  if (card.state === State.Review) return card.due.getTime() < endOfDay.getTime();
  return card.due.getTime() <= now.getTime() + LEARN_AHEAD_MS;
}

/**
 * Coada sesiunii zilnice: repetițiile scadente (cele mai întârziate primele),
 * cu un card nou intercalat la fiecare REVIEWS_PER_NEW repetiții.
 * În modul „ambele”, cardurile noi sunt cuvinte noi (IT → RO) alternate cu carduri deblocate din a doua direcție.
 */
export function buildDailySession({
  now,
  settings,
  cards,
  words,
  reviewsDoneToday,
}: BuildSessionArgs): SessionItem[] {
  const { active, forNewWords } = directionsOf(settings.direction);
  const today = studyDayOf(now);
  const endOfDay = endOfStudyDay(now);
  const vocab = cards.filter((c) => c.kind === "vocab" && active.includes(c.variant as Direction));

  const reviewBudget = Math.max(0, settings.maxReviewsPerDay - reviewsDoneToday);
  const reviews = vocab
    .filter((c) => isDue(c, now, endOfDay))
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, reviewBudget);

  // un card introdus azi e „cuvânt nou” dacă cuvântul nu avea alt card înainte, altfel e card invers deblocat azi
  const olderWord = new Set(vocab.filter((c) => c.introducedOn !== today).map((c) => c.wordId));
  const introducedToday = vocab.filter((c) => c.introducedOn === today);
  const newWordsToday = new Set(introducedToday.filter((c) => !olderWord.has(c.wordId)).map((c) => c.wordId)).size;
  const reversedToday = introducedToday.filter((c) => olderWord.has(c.wordId)).length;
  const newBudget = Math.max(0, settings.newPerDay - newWordsToday);
  const known = new Set(vocab.map((c) => c.wordId));
  const fresh = orderNewWords(
    words.filter((w) => !known.has(w.id) && isUpTo(w.level, settings.level)),
    settings.nounShare,
  ).slice(
    0,
    newBudget,
  );

  const reverseBudget = settings.direction === "both" ? Math.max(0, (settings.newReversePerDay ?? 0) - reversedToday) : 0;
  const reversed = reverseCandidates(vocab, today).slice(0, reverseBudget);

  const newWords = fresh.map(
    (w): SessionItem => ({ cardId: vocabCardId(w.id, forNewWords), wordId: w.id, variant: forNewWords, isNew: true }),
  );
  return spreadSameWord(
    interleave(
      reviews.map((c): SessionItem => ({ cardId: c.cardId, wordId: c.wordId, variant: c.variant as Direction, isNew: false })),
      alternate(newWords, reversed),
    ),
  );
}
