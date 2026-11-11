import type { DrillRequest, DrillTopic, DrillWeakSpot } from "../schemas.js";
import { escapePromptData } from "./scenario.js";

type Level = "A1" | "A2" | "B1";

const levelGuidance: Record<Level, string> = {
  A1:
    "A1: very frequent nouns and verbs, Präsens only, short main clauses (max ~9 words). Distractors should be common beginner confusions (der/die/das, wrong verb ending).",
  A2:
    "A2: everyday vocabulary, Präsens, Perfekt and simple modal verbs, short subordinate clauses when the topic requires them (max ~13 words). Distractors should reflect real A2 mistakes.",
  B1:
    "B1: connected everyday German, common connectors, Präsens/Perfekt, subordinate clauses (max ~18 words). Distractors should still be clearly wrong, not literary or ambiguous.",
};

const topicGuidance: Record<DrillTopic, string> = {
  articles:
    "Definite articles across Nominativ, Akkusativ and Dativ, including plural forms. One gap replaces the article. Test gender and case together, never two gaps.",
  cases:
    "Akkusativ vs Dativ driven by the verb or a fixed preposition. One gap replaces the article or article+noun ending. Show why the verb/preposition forces the case.",
  prepositions:
    "Wechselpräpositionen (Wo = Dativ, Wohin = Akkusativ) and fixed prepositional phrases. One gap replaces the article after the preposition, or the preposition itself. The prompt must make the Wo/Wohin contrast visible.",
  verb_position:
    "German verb position: conjugated verb in position 2, inversion after a fronted time/place phrase, verb first in yes/no questions, verb second after a W-word, and the Perfekt frame. Options may be multi-word chunks that fill ONE gap, e.g. options like \"fahre ich\" / \"ich fahre\" / \"fahre\".",
  separable_verbs:
    "Separable verbs in a main clause: the conjugated verb stays in position 2 and the prefix moves to the end. Put the gap at the end and make the options the prefix or the final verb chunk. Cover common verbs such as aufstehen, anrufen, einkaufen, aufräumen, zumachen, abgeben, anfangen.",
  subordinate_clauses:
    "Subordinate clauses with weil, dass, wenn, ob, bevor or als: the conjugated verb goes to the very end. Each option should be the whole subordinate clause chunk, e.g. \"weil ich krank bin\" vs \"weil ich bin krank\". One gap only.",
  plurals:
    "German plural forms, including umlaut plurals (-er, -e, -en, -s, -nen) and the extra -n in Dativ plural. One gap replaces the plural noun form, not the article. Use a clear number or plural article in the prompt.",
};

export function buildDrillSystemPrompt(): string {
  return `You are the grammar drill writer inside "Deutsch Brücke", an Arabic-first German learning app for Egyptian Arabic speakers. You write short, correct multiple-choice German questions for CEFR A1–B1.

## NON-NEGOTIABLE OUTPUT RULES
- Return exactly one valid JSON object: {"questions":[...]} with no markdown, no code fences and no commentary.
- Write the requested number of questions, all on the requested topic and level.
- Each question MUST have exactly 4 options and exactly one correct option.
- No two options may be the same, even with different capitalisation, spacing or punctuation.
- "correct_answer" MUST be copied character-for-character from one of the four options.
- Do not make two options grammatically correct. Distractors must be plausible but clearly wrong.
- Do not repeat a question stem inside the same batch.
- Every German sentence must be correct, natural and appropriate for the level.
- Never use unsafe, political, sexual, violent or discriminatory content.

## QUESTION SHAPE
- "prompt_before" + ONE gap + "prompt_after" must form one German sentence. The learner sees the gap between the two parts.
- Put the blank where the answer belongs. Do not include "___" in the fields.
- "prompt_before" or "prompt_after" may be empty, but at least one must contain German text.
- Options fill the single gap. For word-order topics the options may be multi-word chunks, but they still fill one gap.
- "pattern" is a short stable kebab-case slug for the underlying rule, e.g. "dative-article-feminine" or "weil-verb-final". Never put spaces or Arabic in it.
- "weak_spot_ar" and "weak_spot_en" are short learner-facing labels for that rule.

## ARABIC AND ENGLISH
- "hint_ar": one short Egyptian colloquial nudge that does NOT reveal the answer.
- "translation_ar": natural Egyptian Arabic translation of the complete German sentence.
- "explanation_ar": 1–2 short Egyptian colloquial sentences explaining why the answer is right. Contrast with Arabic when it helps (for example: Arabic marks the object by word order, German changes the article itself).
- "hint_en", "translation_en", "explanation_en", "weak_spot_en": concise natural English versions.
- Use Arabic script for Arabic fields and German for German fields. Never mix English into a German sentence.

## CORRECTNESS CHECK BEFORE ANSWERING
For every question, silently verify: exactly 4 distinct options; exactly one option is grammatically correct; correct_answer matches that option exactly; the completed sentence is correct German; the Arabic explanation matches the answer. If any check fails, rewrite the question before returning it.`;
}

function formatWeakSpots(weakSpots: DrillWeakSpot[]): string {
  if (weakSpots.length === 0) {
    return "No recorded weak spots for this learner. Keep the batch balanced across the topic.";
  }
  return weakSpots
    .map((spot, index) => {
      const labels = [spot.labelAr, spot.labelEn].filter(Boolean).join(" / ");
      return `${index + 1}. pattern="${escapePromptData(spot.pattern)}" mistakes=${spot.count}${labels ? ` label="${escapePromptData(labels)}"` : ""}`;
    })
    .join("\n");
}

export function buildDrillUserPrompt(
  input: Pick<DrillRequest, "topic" | "level"> & {
    count: number;
    weakSpots: DrillWeakSpot[];
    excludePrompts?: string[];
  },
): string {
  const excluded = input.excludePrompts ?? [];
  const exclusionBlock =
    excluded.length === 0
      ? ""
      : `\nThese question stems were already accepted. Do NOT repeat them:\n<already_generated>\n${excluded
          .map((prompt) => escapePromptData(prompt))
          .join("\n")}\n</already_generated>\n`;

  return `Write ${input.count} German drill questions.

Topic: ${input.topic}
${topicGuidance[input.topic]}

Requested CEFR level: ${input.level}
${levelGuidance[input.level]}

Recorded weak spots (prioritise these patterns when they fit the topic):
<weak_spots>
${formatWeakSpots(input.weakSpots)}
</weak_spots>
${exclusionBlock}
Return exactly ${input.count} questions in the JSON shape:
{
  "questions": [
    {
      "pattern": "kebab-case-rule-id",
      "prompt_before": "German text before the gap",
      "prompt_after": "German text after the gap.",
      "hint_ar": "تلميح بالمصري",
      "hint_en": "A short English hint",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correct_answer": "option 2",
      "translation_ar": "الترجمة الكاملة بالمصري",
      "translation_en": "Full English translation",
      "explanation_ar": "شرح قصير بالمصري",
      "explanation_en": "Short English explanation",
      "weak_spot_ar": "اسم القاعدة بالمصري",
      "weak_spot_en": "Rule name in English"
    }
  ]
}

Exactly 4 distinct options per question. Exactly one correct_answer that matches an option character-for-character. No markdown.`;
}

export function buildDrillReplacementPrompt(): string {
  return `Your previous answer could not be parsed or failed the required schema. Return ONLY one valid JSON object with this shape: {"questions":[...]}. Every question needs all required keys, exactly 4 distinct options, and a correct_answer that matches one option exactly. No markdown, no code fences, no commentary.`;
}
