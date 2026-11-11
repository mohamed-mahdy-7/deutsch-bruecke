import { pickBankDrillQuestions } from "../data/drills.js";
import { AppError } from "../lib/errors.js";
import {
  drillResponseSchema,
  type DrillRequest,
  type DrillResponse,
  type DrillWeakSpot,
} from "../schemas.js";
import type { AiGateway } from "./ai.js";
import { normalizeDrillWeakSpots } from "./drillCache.js";
import {
  promptKeysFor,
  sanitizeDrillQuestions,
} from "./drillValidation.js";

const SESSION_SIZE = 10;

const generationFailedMessage =
  "مقدرتش أجهّز أسئلة جديدة دلوقتي. جرّب تاني بعد لحظة، أو استخدم الأسئلة الجاهزة لو متاحة.";

function toExcludePrompts(
  questions: readonly { promptBefore: string; promptAfter: string }[],
): string[] {
  return questions
    .map((question) =>
      `${question.promptBefore} ${question.promptAfter}`.trim(),
    )
    .filter(Boolean);
}

/**
 * Generate one ten-question session. One replacement call is allowed for
 * invalid or missing items; any remaining gap is filled from the deterministic
 * bank and reported through `fallbackCount`.
 */
export async function generateDrillSession(
  input: DrillRequest,
  gateway: AiGateway,
): Promise<DrillResponse> {
  const weakSpots: DrillWeakSpot[] = normalizeDrillWeakSpots(input.weakSpots);
  let firstBatch: Awaited<ReturnType<AiGateway["generateDrills"]>>;

  try {
    firstBatch = await gateway.generateDrills({
      topic: input.topic,
      level: input.level,
      weakSpots,
      count: SESSION_SIZE,
    });
  } catch (error) {
    console.error(
      "[drills] Provider request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new AppError(502, "drill_generation_failed", generationFailedMessage);
  }

  const first = sanitizeDrillQuestions(firstBatch.questions, {
    topic: input.topic,
    level: input.level,
    maxQuestions: SESSION_SIZE,
  });
  let accepted = first.questions;

  if (accepted.length < SESSION_SIZE) {
    try {
      const missing = SESSION_SIZE - accepted.length;
      const replacement = await gateway.generateDrills({
        topic: input.topic,
        level: input.level,
        weakSpots,
        count: missing,
        excludePrompts: toExcludePrompts(accepted),
      });
      const second = sanitizeDrillQuestions(replacement.questions, {
        topic: input.topic,
        level: input.level,
        existingPromptKeys: promptKeysFor(accepted),
        maxQuestions: missing,
      });
      accepted = [...accepted, ...second.questions];
    } catch (error) {
      // A failed replacement still leaves a usable partial session; fill the
      // rest from the bank instead of discarding valid questions.
      console.warn(
        "[drills] Replacement request failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  let fallbackCount = 0;
  if (accepted.length < SESSION_SIZE) {
    const usedPromptKeys = promptKeysFor(accepted);
    const fallbackRaw = pickBankDrillQuestions({
      topic: input.topic,
      level: input.level,
      count: SESSION_SIZE - accepted.length,
      excludePrompts: toExcludePrompts(accepted),
    });
    const fallback = sanitizeDrillQuestions(fallbackRaw, {
      topic: input.topic,
      level: input.level,
      existingPromptKeys: usedPromptKeys,
      maxQuestions: SESSION_SIZE - accepted.length,
    });
    accepted = [...accepted, ...fallback.questions];
    fallbackCount = fallback.questions.length;
  }

  return drillResponseSchema.parse({
    questions: accepted.slice(0, SESSION_SIZE),
    fallbackCount,
  });
}
