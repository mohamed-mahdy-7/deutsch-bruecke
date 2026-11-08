import type {
  Conversation,
  ProgressState,
  VocabCard,
  WeakSpot,
} from "@/types/domain";

function mergeVocabCard(remote: VocabCard, local: VocabCard): VocabCard {
  const remoteReviewed = remote.lastReviewedAt
    ? new Date(remote.lastReviewedAt).getTime()
    : 0;
  const localReviewed = local.lastReviewedAt
    ? new Date(local.lastReviewedAt).getTime()
    : 0;
  if (localReviewed > remoteReviewed) return local;
  if (remoteReviewed > localReviewed) return remote;
  // If neither has been reviewed, preserve the earlier due date so cards don't
  // disappear from a queue because of a merge.
  return new Date(local.dueDate).getTime() < new Date(remote.dueDate).getTime()
    ? local
    : remote;
}

function mergeWeakSpot(remote: WeakSpot, local: WeakSpot): WeakSpot {
  const latest = new Date(local.lastSeen) > new Date(remote.lastSeen) ? local : remote;
  return {
    ...latest,
    count: Math.max(remote.count, local.count),
    lastSeen:
      new Date(local.lastSeen) > new Date(remote.lastSeen)
        ? local.lastSeen
        : remote.lastSeen,
  };
}

function mergeConversation(remote: Conversation, local: Conversation): Conversation {
  const messageMap = new Map(local.messages.map((message) => [message.id, message]));
  for (const message of remote.messages) {
    const existing = messageMap.get(message.id);
    if (!existing) {
      messageMap.set(message.id, message);
      continue;
    }
    messageMap.set(message.id, {
      ...message,
      // A correction might have completed locally while an older remote
      // snapshot has the same user message without one.
      ...(existing.correction ? { correction: existing.correction } : {}),
      ...(existing.mode ? { mode: existing.mode } : {}),
      ...(existing.vocabulary ? { vocabulary: existing.vocabulary } : {}),
    });
  }
  const updatedAt =
    new Date(local.updatedAt) > new Date(remote.updatedAt)
      ? local.updatedAt
      : remote.updatedAt;
  return {
    ...(new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote),
    messages: [...messageMap.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
    updatedAt,
  };
}

/**
 * Merge local and remote progress without double-counting. Used when the same
 * account has offline activity on this device.
 */
export function mergeProgress(
  remote: ProgressState,
  local: ProgressState,
): ProgressState {
  const profile =
    local.profile.onboardingCompleted || !remote.profile.onboardingCompleted
      ? { ...remote.profile, ...local.profile }
      : remote.profile;

  const weakSpotsMap = new Map<string, WeakSpot>();
  for (const spot of remote.weakSpots) {
    weakSpotsMap.set(`${spot.topic}::${spot.pattern}`, spot);
  }
  for (const spot of local.weakSpots) {
    const key = `${spot.topic}::${spot.pattern}`;
    const existing = weakSpotsMap.get(key);
    weakSpotsMap.set(key, existing ? mergeWeakSpot(existing, spot) : spot);
  }

  const vocabMap = new Map<string, VocabCard>();
  for (const card of remote.vocabCards) vocabMap.set(card.id, card);
  for (const card of local.vocabCards) {
    const existing = vocabMap.get(card.id);
    vocabMap.set(card.id, existing ? mergeVocabCard(existing, card) : card);
  }

  const drillMap = new Map<string, ProgressState["drillResults"][number]>();
  for (const result of remote.drillResults) drillMap.set(result.id, result);
  for (const result of local.drillResults) {
    if (!drillMap.has(result.id)) drillMap.set(result.id, result);
  }

  const conversationMap = new Map<string, Conversation>();
  for (const conversation of remote.conversations) {
    conversationMap.set(conversation.id, conversation);
  }
  for (const conversation of local.conversations) {
    const existing = conversationMap.get(conversation.id);
    conversationMap.set(
      conversation.id,
      existing ? mergeConversation(existing, conversation) : conversation,
    );
  }

  const activityMap = new Map<string, ProgressState["activity"][number]>();
  for (const day of remote.activity) activityMap.set(day.date, day);
  for (const day of local.activity) {
    const existing = activityMap.get(day.date);
    activityMap.set(
      day.date,
      existing
        ? {
            date: day.date,
            xp: Math.max(existing.xp, day.xp),
            seconds: Math.max(existing.seconds, day.seconds),
          }
        : day,
    );
  }

  const localPractice = local.streak.lastPracticeDate ?? "";
  const remotePractice = remote.streak.lastPracticeDate ?? "";
  const streak =
    localPractice > remotePractice
      ? {
          current: local.streak.current,
          longest: Math.max(local.streak.longest, remote.streak.longest),
          lastPracticeDate: local.streak.lastPracticeDate,
        }
      : {
          current: Math.max(local.streak.current, remote.streak.current),
          longest: Math.max(local.streak.longest, remote.streak.longest),
          lastPracticeDate: remote.streak.lastPracticeDate,
        };

  return {
    version: 1,
    ownerId: remote.ownerId,
    profile,
    xp: Math.max(remote.xp, local.xp),
    weakSpots: [...weakSpotsMap.values()],
    vocabCards: [...vocabMap.values()],
    drillResults: [...drillMap.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    conversations: [...conversationMap.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    activity: [...activityMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    streak,
  };
}
