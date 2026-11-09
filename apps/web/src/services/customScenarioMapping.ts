import type {
  CustomScenario,
  CustomScenarioDraft,
  Scenario,
} from "@/types/domain";
import type { GeneratedScenario } from "@/services/ai";

const SCENARIO_COLORS: Scenario["color"][] = [
  "teal",
  "orange",
  "blue",
  "rose",
  "green",
];

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function generatedScenarioToDraft(
  generated: GeneratedScenario,
): CustomScenarioDraft {
  return {
    titleDe: generated.title_de,
    titleAr: generated.title_ar,
    emoji: generated.emoji,
    settingAr: generated.setting_ar,
    aiRoleDe: generated.ai_role_de,
    learnerRoleAr: generated.learner_role_ar,
    goalAr: generated.goal_ar,
    level: generated.level,
    formality: generated.formality,
    tone: generated.tone,
    grammarFocus: [...generated.grammar_focus],
    keyVocab: generated.key_vocab.map((item) => ({
      de: item.de,
      article: item.article,
      plural: item.plural,
      ar: item.ar,
    })),
    usefulPhrases: generated.useful_phrases.map((item) => ({
      de: item.de,
      ar: item.ar,
    })),
    openingDe: generated.opening_message_de,
    openingAr: generated.opening_message_ar,
  };
}

export function customScenarioToDraft(
  scenario: CustomScenario,
): CustomScenarioDraft {
  return {
    titleDe: scenario.titleDe,
    titleAr: scenario.titleAr,
    emoji: scenario.emoji,
    settingAr: scenario.settingAr,
    aiRoleDe: scenario.aiRoleDe,
    learnerRoleAr: scenario.learnerRoleAr,
    goalAr: scenario.goalAr,
    level: scenario.level,
    formality: scenario.formality,
    tone: scenario.tone,
    grammarFocus: [...scenario.grammarFocus],
    keyVocab: scenario.keyVocab.map((item) => ({ ...item })),
    usefulPhrases: scenario.usefulPhrases.map((item) => ({ ...item })),
    openingDe: scenario.openingDe,
    openingAr: scenario.openingAr,
  };
}

/**
 * The API accepts the exact snake_case contract. Custom scenarios are sent as
 * validated data on every chat turn, never as free-form server-side state.
 */
export function customScenarioToApiPayload(
  scenario: CustomScenario | CustomScenarioDraft,
): GeneratedScenario {
  return {
    title_de: scenario.titleDe,
    title_ar: scenario.titleAr,
    emoji: scenario.emoji,
    setting_ar: scenario.settingAr,
    ai_role_de: scenario.aiRoleDe,
    learner_role_ar: scenario.learnerRoleAr,
    goal_ar: scenario.goalAr,
    level: scenario.level,
    formality: scenario.formality,
    tone: scenario.tone,
    grammar_focus: [...scenario.grammarFocus],
    key_vocab: scenario.keyVocab.map((item) => ({
      de: item.de,
      article: item.article,
      plural: item.plural,
      ar: item.ar,
    })),
    useful_phrases: scenario.usefulPhrases.map((item) => ({
      de: item.de,
      ar: item.ar,
    })),
    opening_message_de: scenario.openingDe,
    opening_message_ar: scenario.openingAr,
  };
}

/**
 * Adapt a custom scenario to the shared rendering/chat shape so the existing
 * tutor screen and conversation store work unchanged.
 */
export function customScenarioToScenario(scenario: CustomScenario): Scenario {
  const color =
    SCENARIO_COLORS[hashString(scenario.id) % SCENARIO_COLORS.length] ??
    "teal";

  return {
    id: scenario.id,
    titleAr: scenario.titleAr,
    titleEn: scenario.titleDe,
    descriptionAr: scenario.goalAr,
    descriptionEn: scenario.goalAr,
    level: scenario.level,
    durationMinutes: 8,
    settingAr: scenario.settingAr,
    settingEn: scenario.settingAr,
    aiRoleAr: scenario.aiRoleDe,
    aiRoleEn: scenario.aiRoleDe,
    openingDe: scenario.openingDe,
    openingAr: scenario.openingAr,
    openingEn: scenario.openingDe,
    color,
    goalsAr: [scenario.goalAr],
    goalsEn: [scenario.goalAr],
    emoji: scenario.emoji,
  };
}
