import { describe, expect, it } from "vitest";
import {
  CURRICULUM_LESSONS,
  CURRICULUM_UNITS,
} from "@/data/curriculum";
import type { CurriculumCompletion } from "@/types/domain";
import {
  completedLessonIds,
  curriculumLessonStatus,
  curriculumLevelProgress,
  curriculumLevelUnlocked,
  isLessonUnlocked,
  isUnitUnlocked,
  mergeCurriculumCompletions,
  nextCurriculumLesson,
  overallCurriculumProgress,
} from "./curriculum";

function completionsFor(
  lessonIds: readonly string[],
  completedAt = "2026-01-01T10:00:00.000Z",
): CurriculumCompletion[] {
  return lessonIds.map((lessonId) => ({ lessonId, completedAt }));
}

const firstUnit = CURRICULUM_UNITS[0]!;
const secondUnit = CURRICULUM_UNITS[1]!;

describe("curriculum progression", () => {
  it("opens only the first lesson of the first unit on a fresh account", () => {
    const fresh: CurriculumCompletion[] = [];
    expect(isUnitUnlocked(firstUnit, fresh)).toBe(true);
    expect(isLessonUnlocked(firstUnit.lessons[0]!, fresh)).toBe(true);
    expect(isLessonUnlocked(firstUnit.lessons[1]!, fresh)).toBe(false);
    expect(isUnitUnlocked(secondUnit, fresh)).toBe(false);
    expect(nextCurriculumLesson(fresh)?.id).toBe(firstUnit.lessons[0]!.id);
  });

  it("unlocks the next lesson after completing the previous one", () => {
    const completions = completionsFor([firstUnit.lessons[0]!.id]);
    expect(isLessonUnlocked(firstUnit.lessons[1]!, completions)).toBe(true);
    expect(isLessonUnlocked(firstUnit.lessons[2]!, completions)).toBe(false);
    expect(nextCurriculumLesson(completions)?.id).toBe(
      firstUnit.lessons[1]!.id,
    );
  });

  it("unlocks the next unit only after finishing every lesson in the current unit", () => {
    const threeDone = completionsFor(
      firstUnit.lessons.slice(0, 3).map((lesson) => lesson.id),
    );
    expect(isUnitUnlocked(secondUnit, threeDone)).toBe(false);

    const allDone = completionsFor(
      firstUnit.lessons.map((lesson) => lesson.id),
    );
    expect(isUnitUnlocked(secondUnit, allDone)).toBe(true);
    expect(isLessonUnlocked(secondUnit.lessons[0]!, allDone)).toBe(true);
    expect(nextCurriculumLesson(allDone)?.id).toBe(secondUnit.lessons[0]!.id);
  });

  it("reports done, available, and locked statuses", () => {
    const completions = completionsFor([firstUnit.lessons[0]!.id]);
    expect(curriculumLessonStatus(firstUnit.lessons[0]!, completions)).toBe(
      "done",
    );
    expect(curriculumLessonStatus(firstUnit.lessons[1]!, completions)).toBe(
      "available",
    );
    expect(curriculumLessonStatus(firstUnit.lessons[2]!, completions)).toBe(
      "locked",
    );
  });

  it("computes unit, level, and overall percentages", () => {
    const completions = completionsFor([
      ...firstUnit.lessons.map((lesson) => lesson.id),
      secondUnit.lessons[0]!.id,
      secondUnit.lessons[1]!.id,
    ]);

    expect(overallCurriculumProgress(completions)).toEqual({
      completed: 6,
      total: 36,
      percent: 17,
    });
    expect(curriculumLevelProgress("A1", completions)).toEqual({
      completed: 6,
      total: 12,
      percent: 50,
    });
    expect(curriculumLevelProgress("A2", completions)).toEqual({
      completed: 0,
      total: 12,
      percent: 0,
    });
    expect(curriculumLevelUnlocked("A2", completions)).toBe(false);
  });

  it("ignores completions that do not belong to the path", () => {
    const completions: CurriculumCompletion[] = [
      { lessonId: "not-a-lesson", completedAt: "2026-01-01T00:00:00.000Z" },
      ...completionsFor([firstUnit.lessons[0]!.id]),
    ];
    expect(completedLessonIds(completions).size).toBe(1);
    expect(overallCurriculumProgress(completions).completed).toBe(1);
  });

  it("returns no next lesson once the whole path is complete", () => {
    const all = completionsFor(
      CURRICULUM_LESSONS.map((lesson) => lesson.id),
    );
    expect(overallCurriculumProgress(all).percent).toBe(100);
    expect(nextCurriculumLesson(all)).toBeNull();
  });
});

describe("mergeCurriculumCompletions", () => {
  it("unions lessons without duplicating them", () => {
    const remote: CurriculumCompletion[] = [
      {
        lessonId: "a1-01-1",
        completedAt: "2026-01-02T10:00:00.000Z",
        score: 80,
      },
      {
        lessonId: "a1-01-2",
        completedAt: "2026-01-03T10:00:00.000Z",
      },
    ];
    const local: CurriculumCompletion[] = [
      {
        lessonId: "a1-01-1",
        completedAt: "2026-01-01T10:00:00.000Z",
        score: 95,
      },
      {
        lessonId: "a1-01-3",
        completedAt: "2026-01-04T10:00:00.000Z",
      },
    ];

    const merged = mergeCurriculumCompletions(remote, local);
    expect(merged).toHaveLength(3);
    expect(merged.find((item) => item.lessonId === "a1-01-1")).toEqual({
      lessonId: "a1-01-1",
      completedAt: "2026-01-01T10:00:00.000Z",
      score: 95,
    });
  });

  it("drops unknown lesson ids", () => {
    expect(
      mergeCurriculumCompletions(
        [{ lessonId: "ghost", completedAt: "2026-01-01T00:00:00.000Z" }],
        [],
      ),
    ).toEqual([]);
  });
});
