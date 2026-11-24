import { useCallback, useRef } from "react";
import type { Grade } from "ts-fsrs";
import { db } from "../../data/db/instance.ts";
import { saveReview } from "../../data/db/repositories.ts";
import { quizGrade } from "../../domain/quiz/buildQuizRound.ts";
import { shouldGradeFollowUp } from "../../domain/feed/rewards.ts";
import type { FeedGridQuestion } from "../../domain/feed/types.ts";
import type { SessionItem } from "../../domain/session/buildDailySession.ts";
import { newStoredCard, reviewStoredCard } from "../../domain/srs/scheduler.ts";
import type { StoredCard } from "../../domain/srs/types.ts";
import { studyDayOf } from "../../domain/time/studyDay.ts";

/**
 * Notarea cardurilor din flux, cu regulile existente: repetițiile și cuvintele noi ca la Flashcards (`source: "flashcard"`),
 * grila de după un cuvânt nou ca la Quiz (`source: "quiz"`, doar IT → RO scadent).
 */
export function useFeedRating(retention: number) {
  // un card se notează o singură dată cât se salvează (dublă atingere + „Da”)
  const inFlight = useRef(new Set<string>());

  /** Cardul notat, sau `undefined` dacă același card se notează chiar acum. */
  const rate = useCallback(
    async (item: SessionItem, grade: Grade, shownAt: number): Promise<StoredCard | undefined> => {
      if (inFlight.current.has(item.cardId)) return undefined;
      inFlight.current.add(item.cardId);
      try {
        const now = new Date();
        const existing = await db.cards.get(item.cardId);
        const card = existing ?? newStoredCard({ cardId: item.cardId, wordId: item.wordId, kind: "vocab", variant: item.variant }, now, studyDayOf(now));
        const { card: next, log } = reviewStoredCard(card, grade, now, retention);
        await saveReview(db, next, log, { source: "flashcard", now, durationMs: now.getTime() - shownAt });
        return next;
      } finally {
        inFlight.current.delete(item.cardId);
      }
    },
    [retention],
  );

  /** Notează grila de după un cuvânt nou, dacă se poate; întoarce dacă a notat (altfel e exersare liberă). */
  const gradeFollowUp = useCallback(
    async (question: FeedGridQuestion, correct: boolean, shownAt: number): Promise<boolean> => {
      const now = new Date();
      const card = await db.cards.get(question.cardId);
      if (!card || !shouldGradeFollowUp(card, question.direction, now)) return false;
      const { card: next, log } = reviewStoredCard(card, quizGrade(correct), now, retention);
      await saveReview(db, next, log, { source: "quiz", now, durationMs: now.getTime() - shownAt });
      return true;
    },
    [retention],
  );

  return { rate, gradeFollowUp };
}
