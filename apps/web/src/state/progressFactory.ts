import { STARTER_VOCAB } from "@/data/vocabulary";
import { addDays } from "@/lib/dates";
import type { Profile, ProgressState, VocabCard } from "@/types/domain";

export const GUEST_OWNER_ID = "guest";

export function createDefaultProfile(
  now: Date,
  displayName = "",
  overrides: Partial<Profile> = {},
): Profile {
  return {
    displayName,
    level: "A1",
    dailyGoalMinutes: 20,
    uiLanguage: "ar",
    nativeDialect: "egyptian",
    theme: "system",
    onboardingCompleted: false,
    createdAt: now.toISOString(),
    ...overrides,
  };
}

/**
 * Seed the 100-card A1 library. Twelve cards are due immediately; the rest are
 * spread over the next three weeks so the initial queue stays gentle while the
 * full library remains browsable.
 */
export function seedVocabCards(now: Date): VocabCard[] {
  return STARTER_VOCAB.map((seedCard, index) => {
    const dueDate =
      index < 12 ? now.toISOString() : addDays(now, 1 + ((index - 12) % 20)).toISOString();
    return {
      ...seedCard,
      ease: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueDate,
      createdAt: now.toISOString(),
      lastReviewedAt: null,
      source: "seed" as const,
    };
  });
}

export function createDefaultProgress(
  ownerId: string,
  displayName = "",
  now: Date = new Date(),
): ProgressState {
  return {
    version: 1,
    ownerId,
    profile: createDefaultProfile(now, displayName),
    xp: 0,
    weakSpots: [],
    vocabCards: seedVocabCards(now),
    drillResults: [],
    conversations: [],
    activity: [],
    streak: {
      current: 0,
      longest: 0,
      lastPracticeDate: null,
    },
    curriculumCompletions: [],
  };
}
