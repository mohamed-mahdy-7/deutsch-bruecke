import type { SrsQuality, VocabCard } from "@/types/domain";
import { addDays, addMinutes, endOfDay } from "./dates";

/**
 * SM-2 inspired scheduler.
 * q: again=1, hard=3, good=4, easy=5. Scores below 3 reset the repetition
 * chain and bring the card back later in the same day.
 */
export function gradeVocabCard(
  card: VocabCard,
  quality: SrsQuality,
  now: Date = new Date(),
): VocabCard {
  const q = quality === "again" ? 1 : quality === "hard" ? 3 : quality === "good" ? 4 : 5;
  const previousEase = Number.isFinite(card.ease) ? card.ease : 2.5;
  const nextEase = Math.max(
    1.3,
    previousEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (q < 3) {
    return {
      ...card,
      ease: Number(nextEase.toFixed(2)),
      repetitions: 0,
      intervalDays: 0,
      dueDate: addMinutes(now, 10).toISOString(),
      lastReviewedAt: now.toISOString(),
    };
  }

  const repetitions = card.repetitions + 1;
  let intervalDays: number;

  if (repetitions === 1) {
    intervalDays = quality === "easy" ? 3 : 1;
  } else if (repetitions === 2) {
    intervalDays = quality === "hard" ? 3 : quality === "easy" ? 10 : 6;
  } else {
    const multiplier =
      quality === "hard" ? Math.max(1.2, nextEase * 0.8) : quality === "easy" ? nextEase * 1.3 : nextEase;
    intervalDays = Math.max(1, Math.round(Math.max(1, card.intervalDays) * multiplier));
  }

  // Cap runaway intervals at one year for a learning app; no need beyond that.
  intervalDays = Math.min(365, intervalDays);

  return {
    ...card,
    ease: Number(nextEase.toFixed(2)),
    repetitions,
    intervalDays,
    dueDate: addDays(now, intervalDays).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export function isCardDue(card: VocabCard, now: Date = new Date()): boolean {
  return new Date(card.dueDate).getTime() <= endOfDay(now).getTime();
}

export function dueCards(cards: readonly VocabCard[], now: Date = new Date()): VocabCard[] {
  return cards
    .filter((card) => isCardDue(card, now))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function reviewQueue(
  cards: readonly VocabCard[],
  limit = 12,
  now: Date = new Date(),
): VocabCard[] {
  return dueCards(cards, now).slice(0, limit);
}
