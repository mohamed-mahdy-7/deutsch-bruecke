import {
  CURRICULUM_LEVELS,
  CURRICULUM_LESSONS,
  CURRICULUM_UNITS,
} from "@/data/curriculum";
import type {
  CefrLevel,
  CurriculumCompletion,
  CurriculumLesson,
  CurriculumUnit,
} from "@/types/domain";

export interface CurriculumProgress {
  completed: number;
  total: number;
  percent: number;
}

export type CurriculumLessonStatus = "done" | "available" | "locked";

function allLessonIds(): Set<string> {
  return new Set(CURRICULUM_LESSONS.map((lesson) => lesson.id));
}

const VALID_LESSON_IDS = allLessonIds();

export function isCurriculumLessonId(value: string): boolean {
  return VALID_LESSON_IDS.has(value);
}

export function completedLessonIds(
  completions: readonly CurriculumCompletion[],
): Set<string> {
  const ids = new Set<string>();
  for (const completion of completions) {
    if (isCurriculumLessonId(completion.lessonId)) ids.add(completion.lessonId);
  }
  return ids;
}

export function curriculumUnitForLesson(
  lessonId: string,
): CurriculumUnit | null {
  return (
    CURRICULUM_UNITS.find((unit) =>
      unit.lessons.some((lesson) => lesson.id === lessonId),
    ) ?? null
  );
}

export function previousUnit(unit: CurriculumUnit): CurriculumUnit | null {
  return (
    CURRICULUM_UNITS.find((candidate) => candidate.order === unit.order - 1) ??
    null
  );
}

export function curriculumUnitProgress(
  unit: CurriculumUnit,
  completions: readonly CurriculumCompletion[],
): CurriculumProgress {
  const completedIds = completedLessonIds(completions);
  const completed = unit.lessons.filter((lesson) =>
    completedIds.has(lesson.id),
  ).length;
  const total = unit.lessons.length;
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function curriculumLevelProgress(
  level: CefrLevel,
  completions: readonly CurriculumCompletion[],
): CurriculumProgress {
  const units = CURRICULUM_UNITS.filter((unit) => unit.level === level);
  return progressForLessons(
    units.flatMap((unit) => unit.lessons),
    completions,
  );
}

export function overallCurriculumProgress(
  completions: readonly CurriculumCompletion[],
): CurriculumProgress {
  return progressForLessons(CURRICULUM_LESSONS, completions);
}

function progressForLessons(
  lessons: readonly CurriculumLesson[],
  completions: readonly CurriculumCompletion[],
): CurriculumProgress {
  const completedIds = completedLessonIds(completions);
  const completed = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
  const total = lessons.length;
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/**
 * A unit unlocks only when every lesson in the previous unit is complete. The
 * first unit is always open. This keeps the path strict enough to feel guided
 * without hiding later levels behind a paywall-like wall: finishing a unit is
 * always a short, visible goal.
 */
export function isUnitUnlocked(
  unit: CurriculumUnit,
  completions: readonly CurriculumCompletion[],
): boolean {
  const previous = previousUnit(unit);
  if (!previous) return true;
  return curriculumUnitProgress(previous, completions).percent === 100;
}

export function isLessonUnlocked(
  lesson: CurriculumLesson,
  completions: readonly CurriculumCompletion[],
): boolean {
  const unit = curriculumUnitForLesson(lesson.id);
  if (!unit || !isUnitUnlocked(unit, completions)) return false;
  if (lesson.order === 1) return true;
  const previousLesson = unit.lessons[lesson.order - 2];
  if (!previousLesson) return false;
  return completedLessonIds(completions).has(previousLesson.id);
}

export function curriculumLessonStatus(
  lesson: CurriculumLesson,
  completions: readonly CurriculumCompletion[],
): CurriculumLessonStatus {
  if (completedLessonIds(completions).has(lesson.id)) return "done";
  return isLessonUnlocked(lesson, completions) ? "available" : "locked";
}

/** The first unlocked, incomplete lesson in path order. */
export function nextCurriculumLesson(
  completions: readonly CurriculumCompletion[],
): CurriculumLesson | null {
  const completedIds = completedLessonIds(completions);
  for (const unit of CURRICULUM_UNITS) {
    if (!isUnitUnlocked(unit, completions)) continue;
    for (const lesson of unit.lessons) {
      if (completedIds.has(lesson.id)) continue;
      if (isLessonUnlocked(lesson, completions)) return lesson;
    }
  }
  return null;
}

export function curriculumUnitsForLevel(level: CefrLevel): CurriculumUnit[] {
  return CURRICULUM_UNITS.filter((unit) => unit.level === level);
}

export function curriculumLevelUnlocked(
  level: CefrLevel,
  completions: readonly CurriculumCompletion[],
): boolean {
  const units = curriculumUnitsForLevel(level);
  return units.length === 0 || isUnitUnlocked(units[0]!, completions);
}

export function curriculumLessonNumbers(
  completions: readonly CurriculumCompletion[],
): { completed: number; total: number } {
  const progress = overallCurriculumProgress(completions);
  return { completed: progress.completed, total: progress.total };
}

export const CURRICULUM_TOTAL_LESSONS = CURRICULUM_LESSONS.length;
export const CURRICULUM_LEVEL_SEQUENCE = CURRICULUM_LEVELS;

/**
 * Union completions from both devices. The earliest completion wins, while the
 * best score is kept so a replayed lesson cannot lower a saved result.
 */
export function mergeCurriculumCompletions(
  remote: readonly CurriculumCompletion[],
  local: readonly CurriculumCompletion[],
): CurriculumCompletion[] {
  const byLesson = new Map<string, CurriculumCompletion>();
  for (const completion of [...remote, ...local]) {
    if (!isCurriculumLessonId(completion.lessonId)) continue;
    const existing = byLesson.get(completion.lessonId);
    if (!existing) {
      byLesson.set(completion.lessonId, completion);
      continue;
    }
    const earliest =
      new Date(completion.completedAt) < new Date(existing.completedAt)
        ? completion.completedAt
        : existing.completedAt;
    const scores = [existing.score, completion.score].filter(
      (score): score is number => typeof score === "number",
    );
    byLesson.set(completion.lessonId, {
      lessonId: completion.lessonId,
      completedAt: earliest,
      ...(scores.length > 0 ? { score: Math.max(...scores) } : {}),
    });
  }
  return [...byLesson.values()].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
}
