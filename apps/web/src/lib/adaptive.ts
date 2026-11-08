import type { DrillQuestion, WeakSpot } from "@/types/domain";
import { shuffle } from "./utils";

/**
 * Weighted sampling: each question starts with a base weight, and every past
 * mistake on the same pattern adds a large boost. Other questions in the same
 * topic get a smaller boost, preserving variety while targeting weak areas.
 */
export function selectAdaptiveQuestions(
  bank: readonly DrillQuestion[],
  weakSpots: readonly WeakSpot[],
  count: number,
): DrillQuestion[] {
  if (bank.length === 0 || count <= 0) return [];

  const byPattern = new Map<string, number>();
  const byTopic = new Map<string, number>();
  for (const spot of weakSpots) {
    byPattern.set(spot.pattern, (byPattern.get(spot.pattern) ?? 0) + spot.count);
    byTopic.set(spot.topic, (byTopic.get(spot.topic) ?? 0) + spot.count);
  }

  const candidates = shuffle(bank);
  const selected: DrillQuestion[] = [];
  const remaining = [...candidates];

  while (selected.length < Math.min(count, bank.length) && remaining.length > 0) {
    const weights = remaining.map((question) => {
      const patternWeight = (byPattern.get(question.pattern) ?? 0) * 3.5;
      const topicWeight = (byTopic.get(question.topic) ?? 0) * 0.6;
      return 1 + patternWeight + topicWeight;
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let target = Math.random() * total;
    let chosenIndex = remaining.length - 1;
    for (let i = 0; i < remaining.length; i += 1) {
      target -= weights[i] ?? 0;
      if (target <= 0) {
        chosenIndex = i;
        break;
      }
    }
    const [chosen] = remaining.splice(chosenIndex, 1);
    if (chosen) selected.push(chosen);
  }

  return selected;
}

export function buildWeakSpotKey(topic: string, pattern: string): string {
  return `${topic}::${pattern}`;
}

export function sortWeakSpots(spots: readonly WeakSpot[]): WeakSpot[] {
  return [...spots].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });
}

export function topicAccuracy(
  results: ReadonlyArray<{ topic: string; correct: boolean }>,
): Record<string, { attempts: number; correct: number; percent: number }> {
  const grouped = new Map<string, { attempts: number; correct: number }>();
  for (const result of results) {
    const current = grouped.get(result.topic) ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    if (result.correct) current.correct += 1;
    grouped.set(result.topic, current);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([topic, value]) => [
      topic,
      {
        ...value,
        percent:
          value.attempts === 0 ? 0 : Math.round((value.correct / value.attempts) * 100),
      },
    ]),
  );
}
