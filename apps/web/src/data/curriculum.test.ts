import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/data/scenarios";
import type { DrillTopic, ScenarioId } from "@/types/domain";
import {
  CURRICULUM_LESSONS,
  CURRICULUM_UNITS,
} from "./curriculum";

const DRILL_TOPICS = new Set<DrillTopic>([
  "articles",
  "cases",
  "prepositions",
  "verb_position",
  "separable_verbs",
  "subordinate_clauses",
  "plurals",
]);

describe("A1–B1 curriculum data", () => {
  it("contains nine units and thirty-six lessons", () => {
    expect(CURRICULUM_UNITS).toHaveLength(9);
    expect(CURRICULUM_LESSONS).toHaveLength(36);
    expect(CURRICULUM_UNITS.every((unit) => unit.lessons.length === 4)).toBe(
      true,
    );
  });

  it("allocates three units to each CEFR level", () => {
    for (const level of ["A1", "A2", "B1"] as const) {
      expect(CURRICULUM_UNITS.filter((unit) => unit.level === level)).toHaveLength(
        3,
      );
    }
  });

  it("keeps ids, orders, and unit references consistent", () => {
    const unitIds = new Set<string>();
    const lessonIds = new Set<string>();

    CURRICULUM_UNITS.forEach((unit, unitIndex) => {
      expect(unit.order).toBe(unitIndex + 1);
      expect(unitIds.has(unit.id)).toBe(false);
      unitIds.add(unit.id);

      unit.lessons.forEach((lesson, lessonIndex) => {
        expect(lessonIds.has(lesson.id)).toBe(false);
        lessonIds.add(lesson.id);
        expect(lesson.unitId).toBe(unit.id);
        expect(lesson.level).toBe(unit.level);
        expect(lesson.order).toBe(lessonIndex + 1);
        expect(lesson.id.startsWith(`${unit.id}-`)).toBe(true);
        expect(lesson.minutes).toBeGreaterThan(0);
        expect(lesson.xp).toBeGreaterThan(0);
      });
    });
  });

  it("links only to real trainers and supported grammar topics", () => {
    const scenarioIds = new Set(SCENARIOS.map((scenario) => scenario.id));
    const allowedStaticRoutes = new Set([
      "/builder",
      "/vocabulary",
      "/vocabulary/review",
      "/listening",
      "/pronunciation",
    ]);

    for (const lesson of CURRICULUM_LESSONS) {
      expect(lesson.activities.length).toBeGreaterThanOrEqual(2);
      for (const activity of lesson.activities) {
        expect(activity.href.startsWith("/")).toBe(true);
        expect(activity.labelAr.length).toBeGreaterThan(0);
        expect(activity.labelEn.length).toBeGreaterThan(0);

        const [path, query = ""] = activity.href.split("?");
        if (path?.startsWith("/tutor/")) {
          const id = path.slice("/tutor/".length);
          expect(scenarioIds.has(id as ScenarioId)).toBe(true);
          continue;
        }
        if (path === "/grammar") {
          const topic = new URLSearchParams(query).get("topic") as DrillTopic;
          expect(DRILL_TOPICS.has(topic)).toBe(true);
          continue;
        }
        expect(allowedStaticRoutes.has(path ?? "")).toBe(true);
      }
    }
  });

  it("covers every trainer type across the path", () => {
    const kinds = new Set(
      CURRICULUM_LESSONS.flatMap((lesson) =>
        lesson.activities.map((activity) => activity.kind),
      ),
    );
    expect([...kinds].sort()).toEqual([
      "builder",
      "grammar",
      "listening",
      "pronunciation",
      "scenario",
      "vocabulary",
    ]);
  });
});
