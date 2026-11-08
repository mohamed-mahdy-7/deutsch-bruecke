import type {
  ChatMessage,
  Correction,
  GrammarTopic,
  ProgressState,
  WeakSpot,
} from "@/types/domain";
import { addDays, dateKey } from "@/lib/dates";
import { createId } from "@/lib/utils";

function isYesterdayKey(key: string | null, now: Date): boolean {
  return key === dateKey(addDays(now, -1));
}

/**
 * Add XP/seconds to today's activity and update the streak exactly once per
 * calendar day. Pure: returns a new state object.
 */
export function addPracticeActivity(
  state: ProgressState,
  input: { xp: number; seconds: number },
  now: Date,
): ProgressState {
  if (input.xp <= 0 && input.seconds <= 0) return state;

  const today = dateKey(now);
  const existingIndex = state.activity.findIndex((day) => day.date === today);
  const existing =
    existingIndex >= 0 ? state.activity[existingIndex] : undefined;

  const updatedActivity = {
    date: today,
    xp: (existing?.xp ?? 0) + Math.max(0, input.xp),
    seconds: (existing?.seconds ?? 0) + Math.max(0, input.seconds),
  };

  const activity =
    existingIndex >= 0
      ? state.activity.map((day, index) =>
          index === existingIndex ? updatedActivity : day,
        )
      : [...state.activity, updatedActivity];

  let current = state.streak.current;
  if (state.streak.lastPracticeDate !== today) {
    current = isYesterdayKey(state.streak.lastPracticeDate, now)
      ? Math.max(1, state.streak.current + 1)
      : 1;
  }
  current = Math.max(1, current);

  return {
    ...state,
    xp: state.xp + Math.max(0, input.xp),
    activity,
    streak: {
      current,
      longest: Math.max(state.streak.longest, current),
      lastPracticeDate: today,
    },
  };
}

export function addWeakSpotToState(
  state: ProgressState,
  input: {
    topic: GrammarTopic;
    pattern: string;
    labelAr: string;
    labelEn: string;
  },
  now: Date,
): ProgressState {
  const existing = state.weakSpots.find(
    (spot) => spot.topic === input.topic && spot.pattern === input.pattern,
  );

  if (existing) {
    const updated: WeakSpot = {
      ...existing,
      labelAr: input.labelAr,
      labelEn: input.labelEn,
      count: existing.count + 1,
      lastSeen: now.toISOString(),
    };
    return {
      ...state,
      weakSpots: state.weakSpots.map((spot) =>
        spot.id === existing.id ? updated : spot,
      ),
    };
  }

  return {
    ...state,
    weakSpots: [
      ...state.weakSpots,
      {
        id: createId("weak"),
        topic: input.topic,
        pattern: input.pattern,
        labelAr: input.labelAr,
        labelEn: input.labelEn,
        count: 1,
        lastSeen: now.toISOString(),
      },
    ],
  };
}

export function createChatMessage(
  role: ChatMessage["role"],
  content: string,
  now: Date,
): ChatMessage {
  return {
    id: createId("msg"),
    role,
    content,
    createdAt: now.toISOString(),
  };
}

export function mergeCorrectionIntoMessage(
  message: ChatMessage,
  correction: Correction,
): ChatMessage {
  return { ...message, correction };
}

export function normalizeVocabWord(input: string): string {
  return input
    .trim()
    .replace(/^["'„“]/, "")
    .replace(/["'“”]$/, "")
    .replace(/^(der|die|das)\s+/i, "")
    .trim();
}
