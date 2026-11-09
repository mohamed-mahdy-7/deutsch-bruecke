import { describe, expect, it } from "vitest";
import type { CustomScenario } from "@/types/domain";
import {
  mergeCustomScenarios,
  parseCustomScenario,
} from "@/services/customScenarioStore";
import {
  customScenarioToApiPayload,
  customScenarioToScenario,
  generatedScenarioToDraft,
} from "@/services/customScenarioMapping";
import type { GeneratedScenario } from "@/services/ai";

const generated: GeneratedScenario = {
  title_de: "Zimmer im Hotel buchen",
  title_ar: "حجز غرفة في فندق",
  emoji: "🏨",
  setting_ar: "مكتب استقبال في فندق صغير في برلين.",
  ai_role_de: "freundliche Rezeptionistin",
  learner_role_ar: "ضيف عايز يحجز غرفة",
  goal_ar: "احجز غرفة واسأل عن السعر.",
  level: "A2",
  formality: "Sie",
  tone: "friendly",
  grammar_focus: ["Höflichkeitsform Sie", "Akkusativ"],
  key_vocab: [
    { de: "Zimmer", article: "das", plural: "die Zimmer", ar: "غرفة" },
    { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
  ],
  useful_phrases: [
    { de: "Ich möchte ein Zimmer reservieren.", ar: "عايز أحجز غرفة." },
  ],
  opening_message_de: "Guten Tag! Möchten Sie ein Zimmer reservieren?",
  opening_message_ar: "نهارك سعيد! تحب تحجز غرفة؟",
};

function makeCustom(
  overrides: Partial<CustomScenario> = {},
): CustomScenario {
  return {
    ...generatedScenarioToDraft(generated),
    id: "custom_hotel",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("custom scenario mapping", () => {
  it("maps the generated snake_case contract into an editable draft", () => {
    const draft = generatedScenarioToDraft(generated);
    expect(draft).toMatchObject({
      titleDe: generated.title_de,
      titleAr: generated.title_ar,
      aiRoleDe: generated.ai_role_de,
      learnerRoleAr: generated.learner_role_ar,
      openingDe: generated.opening_message_de,
      openingAr: generated.opening_message_ar,
      level: "A2",
      formality: "Sie",
      tone: "friendly",
    });
    expect(draft.keyVocab).toEqual(generated.key_vocab);
  });

  it("round-trips a custom scenario into the chat payload", () => {
    const custom = makeCustom();
    expect(customScenarioToApiPayload(custom)).toEqual(generated);
  });

  it("adapts a custom scenario to the shared tutor screen shape", () => {
    const mapped = customScenarioToScenario(makeCustom());
    expect(mapped).toMatchObject({
      id: "custom_hotel",
      titleAr: "حجز غرفة في فندق",
      titleEn: "Zimmer im Hotel buchen",
      openingDe: "Guten Tag! Möchten Sie ein Zimmer reservieren?",
      level: "A2",
      emoji: "🏨",
    });
  });
});

describe("mergeCustomScenarios", () => {
  it("keeps the newest version of each id and sorts newest first", () => {
    const older = makeCustom({
      titleAr: "نسخة قديمة",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = makeCustom({
      titleAr: "نسخة جديدة",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    const other = makeCustom({
      id: "custom_doctor",
      updatedAt: "2026-01-15T00:00:00.000Z",
    });

    const merged = mergeCustomScenarios([older, other], [newer]);

    expect(merged).toHaveLength(2);
    expect(merged.map((item) => item.id)).toEqual([
      "custom_hotel",
      "custom_doctor",
    ]);
    expect(merged[0]?.titleAr).toBe("نسخة جديدة");
  });
});

describe("parseCustomScenario", () => {
  it("accepts a valid stored record", () => {
    expect(parseCustomScenario(makeCustom())).toMatchObject({
      id: "custom_hotel",
      titleDe: "Zimmer im Hotel buchen",
    });
  });

  it("rejects non-custom ids and malformed articles", () => {
    expect(parseCustomScenario(makeCustom({ id: "cafe" as never }))).toBeNull();
    expect(
      parseCustomScenario({
        ...makeCustom(),
        keyVocab: [
          { de: "Zimmer", article: "le", plural: "die Zimmer", ar: "غرفة" },
          { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
        ],
      }),
    ).toBeNull();
  });

  it("rejects a draft with fewer than two vocabulary items", () => {
    expect(
      parseCustomScenario({
        ...makeCustom(),
        keyVocab: [makeCustom().keyVocab[0]],
      }),
    ).toBeNull();
  });
});
