import Anthropic from "@anthropic-ai/sdk";
import type { ZodType, ZodTypeDef } from "zod";
import { config } from "../config.js";
import { parseJsonObject } from "../lib/json.js";
import {
  drillBatchModelSchema,
  explainResponseSchema,
  scenarioModelResponseSchema,
  simplifyResponseSchema,
  translateResponseSchema,
  tutorResponseSchema,
  wordResponseSchema,
  type AssistAction,
  type DrillBatchModel,
  type DrillTopic,
  type DrillWeakSpot,
  type ExplainResponse,
  type Formality,
  type ScenarioDraft,
  type ScenarioModelResponse,
  type SimplifyResponse,
  type TranslateResponse,
  type TutorResponse,
  type WordResponse,
} from "../schemas.js";
import { buildTutorSystemPrompt, buildTutorRepairPrompt, buildTutorUserTurn } from "../prompts/tutor.js";
import {
  buildScenarioRepairPrompt,
  buildScenarioSystemPrompt,
  buildScenarioUserPrompt,
} from "../prompts/scenario.js";
import {
  buildDrillReplacementPrompt,
  buildDrillSystemPrompt,
  buildDrillUserPrompt,
} from "../prompts/drill.js";
import { pickBankDrillQuestions } from "../data/drills.js";
import {
  buildAssistSystemPrompt,
  buildAssistUserPrompt,
  buildWordSystemPrompt,
  buildWordUserPrompt,
} from "../prompts/assist.js";
import type { ApiScenario } from "../data/scenarios.js";
import { AppError } from "../lib/errors.js";
import { normalizeTutorResponse } from "../lib/normalize.js";
import {
  mapProviderError,
  normalizeAnthropicError,
  ProviderHttpError,
  ProviderNetworkError,
  ProviderTimeoutError,
  withProviderRetry,
} from "./provider.js";

type Level = "A1" | "A2" | "B1";
type Dialect = "egyptian" | "levantine" | "gulf" | "maghrebi" | "msa" | "other";
type Role = "user" | "assistant";
interface HistoryMessage {
  role: Role;
  content: string;
}

interface ModelMessage {
  role: Role;
  content: string;
}

/** Keep history alternating (both providers expect it) and cap its length. */
function normalizeHistory(history: HistoryMessage[]): ModelMessage[] {
  const normalized: ModelMessage[] = [];
  for (const item of history.slice(-10)) {
    const previous = normalized.at(-1);
    if (previous && previous.role === item.role) {
      previous.content = `${previous.content}\n${item.content}`;
    } else {
      normalized.push({ role: item.role, content: item.content });
    }
  }
  // The current learner message is appended separately.
  if (normalized.at(-1)?.role === "user") normalized.pop();
  return normalized;
}

function buildRepairMessages(
  messages: ModelMessage[],
  assistantContent: string,
  repairInstruction: string,
): ModelMessage[] {
  return [
    ...messages,
    { role: "assistant", content: assistantContent },
    { role: "user", content: repairInstruction },
  ];
}

/**
 * Validate model output against the shared Zod contract. Fenced JSON is
 * accepted, and one repair turn is attempted for empty or malformed output.
 */
export async function requestStructuredJson<T>(
  generate: (messages: ModelMessage[]) => Promise<string>,
  messages: ModelMessage[],
  schema: ZodType<T, ZodTypeDef, unknown>,
  repairInstruction: string,
  normalize?: (value: unknown) => unknown,
): Promise<T> {
  let requestMessages = messages;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      raw = (await generate(requestMessages)).trim();
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Log only the error class/status. Provider bodies can echo request
      // metadata, so they never reach logs or the browser.
      console.warn("[ai] Provider request failed:", {
        name: error instanceof Error ? error.name : "unknown",
        status:
          error && typeof (error as { status?: unknown }).status === "number"
            ? (error as { status: number }).status
            : undefined,
      });
      throw mapProviderError(error);
    }

    if (!raw) {
      if (attempt === 0) {
        requestMessages = buildRepairMessages(
          messages,
          "(empty response)",
          repairInstruction,
        );
        continue;
      }
      throw new AppError(
        422,
        "ai_empty_response",
        "The tutor could not generate a reply. Please try again.",
      );
    }

    try {
      const parsed = parseJsonObject(raw);
      const normalized = normalize ? normalize(parsed) : parsed;
      return schema.parse(normalized);
    } catch (error) {
      console.warn(
        `[ai] Invalid structured response on attempt ${attempt + 1}:`,
        error instanceof Error ? error.message : "unknown",
      );
      if (attempt === 0) {
        requestMessages = buildRepairMessages(
          messages,
          raw.slice(0, 6_000),
          repairInstruction,
        );
        continue;
      }
      throw new AppError(
        422,
        "ai_invalid_response",
        "تعذّر معالجة رد المدرّس. جرّب تاني.",
      );
    }
  }

  throw new AppError(
    502,
    "ai_format_error",
    "The tutor's answer could not be processed. Please try once more.",
  );
}

export interface AiGateway {
  readonly mode: "live" | "demo";
  tutor(input: {
    level: Level;
    dialect: Dialect;
    safeMode: boolean;
    learnerMessage: string;
    history: HistoryMessage[];
    scenario: ApiScenario;
  }): Promise<TutorResponse>;
  assist(
    action: AssistAction,
    text: string,
    level: Level,
    dialect: Dialect,
  ): Promise<ExplainResponse | SimplifyResponse | TranslateResponse>;
  word(word: string, context: string, level: Level): Promise<WordResponse>;
  generateScenario(input: {
    idea: string;
    level?: Level;
    formality?: Formality;
  }): Promise<ScenarioModelResponse>;
  generateDrills(input: {
    topic: DrillTopic;
    level: Level;
    weakSpots: DrillWeakSpot[];
    count: number;
    excludePrompts?: string[];
  }): Promise<DrillBatchModel>;
}

/**
 * Shared prompt/schema pipeline used by every live provider. It guarantees
 * Anthropic and Gemini receive identical system prompts, history windows,
 * Zod contracts, and repair instructions.
 */
let geminiStructuredOutputDisabled = false;

const tutorResponseJsonSchema = {
  type: "object",
  properties: {
    reply_de: { type: "string" },
    translation_ar: { type: "string" },
    correction: {
      type: "object",
      properties: {
        corrected: { type: "string" },
        isCorrect: { type: "boolean" },
        mistakes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              original: { type: "string" },
              fix: { type: "string" },
              explanation_ar: { type: "string" },
            },
            required: ["type", "original", "fix", "explanation_ar"],
          },
        },
        praise_ar: { type: "string" },
        follow_up_question_de: { type: "string" },
      },
      required: ["corrected", "mistakes", "praise_ar", "follow_up_question_de"],
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          article: { type: ["string", "null"] },
          plural: { type: ["string", "null"] },
          translation_ar: { type: "string" },
          example_de: { type: "string" },
        },
        required: ["word", "translation_ar", "example_de"],
      },
    },
  },
  required: ["reply_de", "translation_ar", "correction", "vocabulary"],
};

abstract class PromptGateway implements AiGateway {
  abstract readonly mode: "live" | "demo";

  protected abstract requestJson<T>(
    system: string,
    messages: ModelMessage[],
    schema: ZodType<T, ZodTypeDef, unknown>,
    repairInstruction: string,
    maxTokens?: number,
    normalize?: (value: unknown) => unknown,
    responseSchema?: unknown,
  ): Promise<T>;

  async tutor(input: {
    level: Level;
    dialect: Dialect;
    safeMode: boolean;
    learnerMessage: string;
    history: HistoryMessage[];
    scenario: ApiScenario;
  }): Promise<TutorResponse> {
    const system = buildTutorSystemPrompt({
      level: input.level,
      dialect: input.dialect,
      safeMode: input.safeMode,
      scenario: input.scenario,
    });

    return this.requestJson(
      system,
      [
        ...normalizeHistory(input.history),
        { role: "user", content: buildTutorUserTurn(input.learnerMessage) },
      ],
      tutorResponseSchema,
      buildTutorRepairPrompt(),
      // One tutor turn: reply + translation + up to 3 corrections.
      1_800,
      (value) => normalizeTutorResponse(value, input.learnerMessage),
      tutorResponseJsonSchema,
    );
  }

  async assist(
    action: AssistAction,
    text: string,
    level: Level,
    dialect: Dialect,
  ): Promise<ExplainResponse | SimplifyResponse | TranslateResponse> {
    const system = buildAssistSystemPrompt(action, level, dialect);
    const messages: ModelMessage[] = [
      { role: "user", content: buildAssistUserPrompt(text) },
    ];
    const repairInstruction =
      "Return only the exact JSON shape requested. No markdown.";

    // Call requestJson per branch so TypeScript can infer each schema's exact
    // output type. A union of Zod schemas would collapse to the first member.
    if (action === "explain") {
      return this.requestJson(
        system,
        messages,
        explainResponseSchema,
        repairInstruction,
        900,
      );
    }
    if (action === "simplify") {
      return this.requestJson(
        system,
        messages,
        simplifyResponseSchema,
        repairInstruction,
        700,
      );
    }
    return this.requestJson(
      system,
      messages,
      translateResponseSchema,
      repairInstruction,
      700,
    );
  }

  async word(
    word: string,
    context: string,
    level: Level,
  ): Promise<WordResponse> {
    return this.requestJson(
      buildWordSystemPrompt(level),
      [{ role: "user", content: buildWordUserPrompt(word, context) }],
      wordResponseSchema,
      "Return only the exact JSON object requested, with article and plural included for nouns. No markdown.",
      700,
    );
  }

  async generateScenario(input: {
    idea: string;
    level?: Level;
    formality?: Formality;
  }): Promise<ScenarioModelResponse> {
    return this.requestJson(
      buildScenarioSystemPrompt(),
      [{ role: "user", content: buildScenarioUserPrompt(input) }],
      scenarioModelResponseSchema,
      buildScenarioRepairPrompt(),
      1_800,
    );
  }

  async generateDrills(input: {
    topic: DrillTopic;
    level: Level;
    weakSpots: DrillWeakSpot[];
    count: number;
    excludePrompts?: string[];
  }): Promise<DrillBatchModel> {
    return this.requestJson(
      buildDrillSystemPrompt(),
      [{ role: "user", content: buildDrillUserPrompt(input) }],
      drillBatchModelSchema,
      buildDrillReplacementPrompt(),
      // Ten bilingual questions need more room than a single tutor turn.
      4_096,
    );
  }
}

class AnthropicGateway extends PromptGateway {
  override readonly mode = "live" as const;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({
      apiKey,
      // Retries are handled uniformly by withProviderRetry so both providers
      // share one bounded backoff policy (no retry storms).
      maxRetries: 0,
      timeout: config.providerTimeoutMs,
    });
  }

  private async generate(
    system: string,
    messages: ModelMessage[],
    maxTokens = 1_800,
    _responseSchema?: unknown,
  ): Promise<string> {
    return withProviderRetry(async () => {
      try {
        const response = await this.client.messages.create({
          model: config.anthropicModel,
          max_tokens: maxTokens,
          temperature: 0.45,
          system,
          messages,
        });

        return response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim();
      } catch (error) {
        throw normalizeAnthropicError(error);
      }
    });
  }

  protected override requestJson<T>(
    system: string,
    messages: ModelMessage[],
    schema: ZodType<T, ZodTypeDef, unknown>,
    repairInstruction: string,
    maxTokens?: number,
    normalize?: (value: unknown) => unknown,
    _responseSchema?: unknown,
  ): Promise<T> {
    return requestStructuredJson(
      (nextMessages) => this.generate(system, nextMessages, maxTokens),
      messages,
      schema,
      repairInstruction,
      normalize,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Google Gemini gateway                                              */
/* ------------------------------------------------------------------ */

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

class GeminiGateway extends PromptGateway {
  override readonly mode = "live" as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  private async generate(
    system: string,
    messages: ModelMessage[],
    maxTokens = 1_800,
    responseSchema?: unknown,
  ): Promise<string> {
    const payload = await withProviderRetry(async () => {
      let response: Response;
      try {
        // The key travels in a header, never in the URL or logs.
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": this.apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: messages.map((message) => ({
                role: message.role === "assistant" ? "model" : "user",
                parts: [{ text: message.content }],
              })),
              generationConfig: {
                temperature: 0.45,
                maxOutputTokens: maxTokens,
                responseMimeType: "application/json",
                ...(responseSchema ? { responseSchema } : {}),
              },
            }),
            signal: AbortSignal.timeout(config.providerTimeoutMs),
          },
        );
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new ProviderTimeoutError();
        }
        throw new ProviderNetworkError();
      }

      if (!response.ok) {
        let providerMessage = "";
        try {
          const bodyText = await response.text();
          let parsed = null;
          try { parsed = JSON.parse(bodyText); } catch { parsed = null; }
          const rawMessage = parsed?.error?.message ?? bodyText;
          providerMessage = String(rawMessage).slice(0, 300);
          if (parsed?.error?.details) {
            try {
              const details = JSON.stringify(parsed.error.details).slice(0, 300);
              providerMessage = `${providerMessage} ${details}`.slice(0, 300);
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
        console.warn("[ai] Gemini HTTP failure:", {
          status: response.status,
          message: providerMessage,
        });
        throw new ProviderHttpError(response.status, providerMessage);
      }

      const parsed = (await response
        .json()
        .catch(() => null)) as GeminiGenerateContentResponse | null;
      if (!parsed) {
        throw new ProviderNetworkError();
      }
      if (parsed.promptFeedback?.blockReason) {
        throw new AppError(
          422,
          "ai_prompt_blocked",
          "The tutor could not answer that message. Please try rephrasing it.",
        );
      }
      return parsed;
    });

    return (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  protected override async requestJson<T>(
    system: string,
    messages: ModelMessage[],
    schema: ZodType<T, ZodTypeDef, unknown>,
    repairInstruction: string,
    maxTokens?: number,
    normalize?: (value: unknown) => unknown,
    responseSchema?: unknown,
  ): Promise<T> {
    const tryOnce = async (useSchema: boolean): Promise<T> =>
      requestStructuredJson(
        (nextMessages) =>
          this.generate(system, nextMessages, maxTokens, useSchema ? responseSchema : undefined),
        messages,
        schema,
        repairInstruction,
        normalize,
      );

    const canUseSchema =
      Boolean(responseSchema) &&
      config.geminiStructuredOutput &&
      !geminiStructuredOutputDisabled;

    try {
      return await tryOnce(canUseSchema);
    } catch (error) {
      if (
        canUseSchema &&
        error instanceof ProviderHttpError &&
        error.status === 400
      ) {
        geminiStructuredOutputDisabled = true;
        console.warn(
          "[ai] Gemini rejected responseSchema; retrying without it for this process.",
        );
        return await tryOnce(false);
      }
      throw error;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Explicit demo gateway — local UI testing only, never silent in prod */
/* ------------------------------------------------------------------ */

const demoReplies: Record<
  string,
  Array<{ reply_de: string; question_de: string; translation_ar: string }>
> = {
  cafe: [
    {
      reply_de: "Sehr gern! Der Kaffee kommt gleich. Möchten Sie auch ein Stück Kuchen?",
      question_de: "Möchten Sie auch ein Stück Kuchen?",
      translation_ar: "بكل سرور! القهوة هتوصلك على طول. تحب كمان قطعة كيك؟",
    },
    {
      reply_de: "Natürlich. Möchten Sie den Kaffee mit Milch oder ohne Milch?",
      question_de: "Möchten Sie den Kaffee mit Milch oder ohne Milch?",
      translation_ar: "طبعًا. تحب القهوة باللبن ولا من غير لبن؟",
    },
    {
      reply_de: "Gern. Hier ist die Rechnung. Zahlen Sie bar oder mit Karte?",
      question_de: "Zahlen Sie bar oder mit Karte?",
      translation_ar: "بكل سرور. دي الفاتورة. هتدفع كاش ولا بالكارت؟",
    },
  ],
  doctor: [
    {
      reply_de: "Das tut mir leid. Seit wann haben Sie diese Beschwerden?",
      question_de: "Seit wann haben Sie diese Beschwerden?",
      translation_ar: "أنا آسفة لسماع ده. من إمتى عندك الأعراض دي؟",
    },
    {
      reply_de: "Verstehe. Haben Sie auch Fieber oder Schmerzen beim Atmen?",
      question_de: "Haben Sie auch Fieber oder Schmerzen beim Atmen?",
      translation_ar: "فاهمة. عندك كمان سخونية أو ألم وأنت بتتنفس؟",
    },
    {
      reply_de: "Danke für die Information. Trinken Sie viel Wasser und ruhen Sie sich aus. Möchten Sie eine Krankmeldung?",
      question_de: "Möchten Sie eine Krankmeldung?",
      translation_ar: "شكرًا على المعلومة. اشرب مياه كتير وارتاح. تحب شهادة مرضية؟",
    },
  ],
  interview: [
    {
      reply_de: "Danke für die Vorstellung. Was interessiert Sie besonders an dieser Stelle?",
      question_de: "Was interessiert Sie besonders an dieser Stelle?",
      translation_ar: "شكرًا على تقديم نفسك. إيه اللي بيهتمك تحديدًا في الوظيفة دي؟",
    },
    {
      reply_de: "Spannend. Können Sie mir ein Beispiel für eine schwierige Situation bei der Arbeit nennen?",
      question_de: "Können Sie mir ein Beispiel für eine schwierige Situation bei der Arbeit nennen?",
      translation_ar: "مثير للاهتمام. تقدر تديني مثال لموقف صعب واجهته في الشغل؟",
    },
    {
      reply_de: "Gut. Wann könnten Sie bei uns anfangen?",
      question_de: "Wann könnten Sie bei uns anfangen?",
      translation_ar: "جميل. إمتى تقدر تبدأ معانا؟",
    },
  ],
  office: [
    {
      reply_de: "Guten Tag. Wie kann ich Ihnen helfen? Haben Sie schon einen Termin?",
      question_de: "Haben Sie schon einen Termin?",
      translation_ar: "نهارك سعيد. أقدر أساعدك إزاي؟ عندك ميعاد بالفعل؟",
    },
    {
      reply_de: "Kein Problem. Für die Anmeldung brauchen wir Ihren Pass und die Wohnungsgeberbestätigung. Haben Sie beide Dokumente dabei?",
      question_de: "Haben Sie beide Dokumente dabei?",
      translation_ar: "مفيش مشكلة. عشان التسجيل محتاجين جواز السفر وإقرار صاحب السكن. معاك الوثيقتين؟",
    },
    {
      reply_de: "Alles klar. Möchten Sie den Termin lieber vormittags oder nachmittags?",
      question_de: "Möchten Sie den Termin lieber vormittags oder nachmittags?",
      translation_ar: "تمام. تحب يكون الميعاد قبل الظهر ولا بعده؟",
    },
  ],
  shopping: [
    {
      reply_de: "Guten Tag! Wie kann ich Ihnen helfen? Suchen Sie etwas Bestimmtes?",
      question_de: "Suchen Sie etwas Bestimmtes?",
      translation_ar: "أهلًا! أقدر أساعدك إزاي؟ بتدور على حاجة معينة؟",
    },
    {
      reply_de: "Sehr gern. Welche Größe brauchen Sie? Wir haben das Hemd auch in Blau.",
      question_de: "Welche Größe brauchen Sie?",
      translation_ar: "بكل سرور. محتاج مقاس إيه؟ القميص موجود كمان باللون الأزرق.",
    },
    {
      reply_de: "Gern. Die Umkleidekabine ist dort hinten. Passt es Ihnen, oder brauchen Sie eine andere Größe?",
      question_de: "Passt es Ihnen, oder brauchen Sie eine andere Größe?",
      translation_ar: "بكل سرور. غرفة القياس هناك ورا. المقاس مناسب ولا محتاج مقاس تاني؟",
    },
  ],
};

const demoVocabulary: Record<
  string,
  Array<{
    word: string;
    article: "der" | "die" | "das" | null;
    plural: string | null;
    translation_ar: string;
    example_de: string;
  }>
> = {
  cafe: [
    { word: "Rechnung", article: "die", plural: "die Rechnungen", translation_ar: "الفاتورة", example_de: "Die Rechnung ist neun Euro." },
    { word: "Kuchen", article: "der", plural: "die Kuchen", translation_ar: "الكيك", example_de: "Der Kuchen schmeckt lecker." },
  ],
  doctor: [
    { word: "Beschwerden", article: "die", plural: "die Beschwerden", translation_ar: "الأعراض / الشكوى", example_de: "Ich habe seit gestern Beschwerden." },
    { word: "Krankmeldung", article: "die", plural: "die Krankmeldungen", translation_ar: "الشهادة المرضية", example_de: "Ich brauche eine Krankmeldung." },
  ],
  interview: [
    { word: "Erfahrung", article: "die", plural: "die Erfahrungen", translation_ar: "الخبرة", example_de: "Ich habe zwei Jahre Erfahrung." },
    { word: "Stelle", article: "die", plural: "die Stellen", translation_ar: "الوظيفة / المكان", example_de: "Die Stelle interessiert mich sehr." },
  ],
  office: [
    { word: "Termin", article: "der", plural: "die Termine", translation_ar: "الميعاد", example_de: "Ich brauche einen Termin." },
    { word: "Bestätigung", article: "die", plural: "die Bestätigungen", translation_ar: "التأكيد / الإقرار", example_de: "Hier ist meine Bestätigung." },
  ],
  shopping: [
    { word: "Größe", article: "die", plural: "die Größen", translation_ar: "المقاس", example_de: "Welche Größe brauchen Sie?" },
    { word: "Umkleidekabine", article: "die", plural: "die Umkleidekabinen", translation_ar: "غرفة القياس", example_de: "Wo ist die Umkleidekabine?" },
  ],
};

const praiseOptions = [
  "حلو جدًا إنك جرّبت تتكلم! الوضوح أهم من الكمال.",
  "برافو، وصلت الفكرة! كمّل كده.",
  "مجهود جميل! كل محاولة بتقرّبك أكتر.",
];

export function normalizeDemoCorrection(input: string): {
  corrected: string;
  mistakes: Array<{
    type: "article" | "verb_position" | "punctuation";
    original: string;
    fix: string;
    explanation_ar: string;
  }>;
} {
  let corrected = input.trim();
  const mistakes: Array<{
    type: "article" | "verb_position" | "punctuation";
    original: string;
    fix: string;
    explanation_ar: string;
  }> = [];

  const rules: Array<{
    pattern: RegExp;
    replacement: string;
    type: "article" | "verb_position";
    explanation_ar: string;
  }> = [
    {
      pattern: /\bdas (Mann|Hund|Tisch|Termin)\b/i,
      replacement: "der $1",
      type: "article",
      explanation_ar: "الكلمات دي مذكّر، فبنستخدم معاها «der» مش «das».",
    },
    {
      pattern: /\bder (Frau|Wohnung|Rechnung|Größe|Stelle)\b/i,
      replacement: "die $1",
      type: "article",
      explanation_ar: "الأسماء دي مؤنثة؛ عشان كده الأداة الصح «die».",
    },
    {
      pattern: /\bdie (Buch|Kind|Auto|Café)\b/i,
      replacement: "das $1",
      type: "article",
      explanation_ar: "دي أسماء محايدة، والأداة المناسبة ليها «das».",
    },
    {
      pattern: /\bHeute ich (bin|gehe|habe|möchte)\b/i,
      replacement: "Heute $1 ich",
      type: "verb_position",
      explanation_ar: "لما نبدأ بالزمن، الفعل لازم ييجي في المكان التاني: Heute + فعل + فاعل.",
    },
    {
      pattern: /\bMorgen ich (bin|gehe|habe|möchte)\b/i,
      replacement: "Morgen $1 ich",
      type: "verb_position",
      explanation_ar: "قاعدة الفعل التاني: لو «Morgen» في الأول، الفعل ييجي بعده والفاعل بعده.",
    },
    {
      pattern: /\bein Kaffee\b/gi,
      replacement: "einen Kaffee",
      type: "article",
      explanation_ar: "«Kaffee» مذكّر، ومع فعل بياخد مفعول مباشر بنقول «einen».",
    },
  ];

  for (const rule of rules) {
    // Normalise global patterns to a single-match matcher: we correct only the
    // first occurrence, and String.match omits `index` for global regexes.
    const search = rule.pattern.global
      ? new RegExp(rule.pattern.source, rule.pattern.flags.replace("g", ""))
      : rule.pattern;
    const match = corrected.match(search);
    if (!match || !match[0] || typeof match.index !== "number") continue;

    const original = match[0];
    let fix = original.replace(search, rule.replacement);
    // Only restore a capital letter when the fragment begins a sentence;
    // article fixes in the middle of a sentence must stay lowercase.
    if (rule.pattern.flags.includes("i") && /^[a-zäöüß]/.test(fix)) {
      const before = corrected.slice(0, match.index).trimEnd();
      const atSentenceStart = before.length === 0 || /[.!?]$/.test(before);
      if (atSentenceStart) {
        fix = fix.charAt(0).toUpperCase() + fix.slice(1);
      }
    }
    corrected = corrected.slice(0, match.index) + fix + corrected.slice(match.index + original.length);
    mistakes.push({
      type: rule.type,
      original,
      fix,
      explanation_ar: rule.explanation_ar,
    });
  }

  // Typed input often has no final punctuation. Treat that as a style note only
  // for demo; do not overwhelm.
  const firstLetter = corrected.charAt(0);
  if (/^[a-zäöüß]/.test(firstLetter)) {
    corrected = firstLetter.toUpperCase() + corrected.slice(1);
  }

  return { corrected, mistakes: mistakes.slice(0, 3) };
}

const demoScenarioRefusalPattern =
  /\b(?:porn|sex(?:ual)?|nazi|bomb|weapon|kill|murder|suicide|self[- ]?harm|drugs?|heroin|cocaine|hack(?:ing)?|python|javascript|programming|coding)\b|جنس|عاهرة|قنبلة|سلاح|اقتل|انتحار|مخدرات|هيروين|كوكايين|اختراق|برمجة|كود/i;

const demoScenarioRefusalMessage =
  "الفكرة دي مش مناسبة للتمرين على المحادثة. جرّب موقف يومي زي حجز فندق أو كلام مع دكتور، وأنا أجهّزلك سيناريو حلو.";

/**
 * Deterministic demo scenarios keep the full creator flow testable without a
 * provider key. The content is intentionally generic but follows the selected
 * level and formality.
 */
function pickDemoScenario(input: {
  idea: string;
  level?: Level;
  formality?: Formality;
}): ScenarioDraft {
  const idea = input.idea.toLowerCase();
  const level = input.level ?? "A1";
  const politeSetting = /(hotel|zimmer|reservier|arzt|doctor|schmerz|fندق|فندق|غرفة|حجز|دكتور|ألم|مستشفى|مطعم|restaurant|büro|behörde|amt)/i.test(
    idea,
  );
  const formality: Formality = input.formality ?? (politeSetting ? "Sie" : "du");
  const du = formality === "du";

  if (/(hotel|zimmer|reservier|فندق|غرفة|حجز|أوضة)/i.test(idea)) {
    return {
      title_de: "Zimmer im Hotel buchen",
      title_ar: "حجز غرفة في فندق",
      emoji: "🏨",
      setting_ar:
        "مكتب استقبال في فندق صغير وهادي في برلين، والموظفة واقفة ورا الكاونتر.",
      ai_role_de: "freundliche Rezeptionistin in einem kleinen Berliner Hotel",
      learner_role_ar: "ضيف عايز يحجز غرفة ويستفسر عن السعر والإفطار",
      goal_ar:
        "احجز غرفة لليلة أو ليلتين، واسأل عن السعر وموعد الإفطار، واتأكد من طريقة الدفع.",
      level,
      formality,
      grammar_focus: [
        du ? "du-Form" : "Höflichkeitsform Sie",
        "möchten + Akkusativ",
        "Fragen mit was/wie viel",
      ],
      key_vocab: [
        { de: "Zimmer", article: "das", plural: "die Zimmer", ar: "غرفة" },
        { de: "Nacht", article: "die", plural: "die Nächte", ar: "ليلة" },
        {
          de: "Reservierung",
          article: "die",
          plural: "die Reservierungen",
          ar: "حجز",
        },
      ],
      useful_phrases: [
        {
          de: du
            ? "Ich möchte ein Zimmer reservieren."
            : "Ich möchte ein Zimmer reservieren, bitte.",
          ar: "عايز أحجز غرفة، لو سمحت.",
        },
        { de: "Was kostet die Nacht?", ar: "الليلة بكام؟" },
      ],
      opening_message_de: du
        ? "Hallo! Willkommen im Hotel Sonne. Möchtest du ein Zimmer reservieren?"
        : "Guten Tag! Willkommen im Hotel Sonne. Möchten Sie ein Zimmer reservieren?",
      opening_message_ar: du
        ? "أهلًا! نورت فندق Sonne. تحب تحجز غرفة؟"
        : "نهارك سعيد! نورت فندق Sonne. تحب تحجز غرفة؟",
    };
  }

  if (/(restaurant|essen|bestell|مطعم|أكل|اطلب|عشاء|غدا)/i.test(idea)) {
    return {
      title_de: "Im Restaurant bestellen",
      title_ar: "الطلب في مطعم",
      emoji: "🍽️",
      setting_ar: "مطعم مصري صغير في برلين، والجَرْسون جاي ياخد الطلب.",
      ai_role_de: "freundlicher Kellner in einem kleinen Restaurant",
      learner_role_ar: "زائر عايز يطلب أكل وشراب ويسأل عن الحساب",
      goal_ar: "اطلب أكلة وشراب، واسأل عن المكونات، واطلب الحساب في الآخر.",
      level,
      formality,
      grammar_focus: [
        du ? "du-Form" : "Höflichkeitsform Sie",
        "Akkusativ",
        "möchten + Akkusativ",
      ],
      key_vocab: [
        { de: "Gericht", article: "das", plural: "die Gerichte", ar: "طبق" },
        { de: "Getränk", article: "das", plural: "die Getränke", ar: "مشروب" },
        { de: "Rechnung", article: "die", plural: "die Rechnungen", ar: "الفاتورة" },
      ],
      useful_phrases: [
        { de: "Ich möchte … bestellen.", ar: "عايز أطلب …" },
        { de: "Die Rechnung, bitte.", ar: "الحساب، لو سمحت." },
      ],
      opening_message_de: du
        ? "Hallo! Willkommen im Restaurant. Möchtest du etwas bestellen?"
        : "Guten Abend! Willkommen im Restaurant. Möchten Sie etwas bestellen?",
      opening_message_ar: du
        ? "أهلًا! نورت المطعم. تحب تطلب حاجة؟"
        : "مساء الخير! نورت المطعم. تحب تطلب حاجة؟",
    };
  }

  if (/(arzt|doctor|schmerz|krank|دكتور|ألم|مستشفى|تعبان|مرض)/i.test(idea)) {
    return {
      title_de: "Beim Arzt",
      title_ar: "عند الدكتور",
      emoji: "🩺",
      setting_ar: "عيادة دكتور عام في برلين، والدكتور بيسأل عن الأعراض.",
      ai_role_de: "ruhige Hausärztin in einer Berliner Praxis",
      learner_role_ar: "مريض عايز يوصف الأعراض ويسأل عن العلاج",
      goal_ar: "اوصف الأعراض ومدة الألم، واسأل عن الدوا ولو محتاج شهادة مرضية.",
      level,
      formality,
      grammar_focus: [
        du ? "du-Form" : "Höflichkeitsform Sie",
        "seit + Dativ",
        "Perfekt",
      ],
      key_vocab: [
        { de: "Schmerzen", article: "die", plural: "die Schmerzen", ar: "ألم" },
        { de: "Fieber", article: "das", plural: null, ar: "سخونية" },
        {
          de: "Krankmeldung",
          article: "die",
          plural: "die Krankmeldungen",
          ar: "شهادة مرضية",
        },
      ],
      useful_phrases: [
        { de: "Ich habe seit … Schmerzen.", ar: "عندي ألم من …" },
        { de: "Brauche ich ein Medikament?", ar: "محتاج دوا؟" },
      ],
      opening_message_de: du
        ? "Hallo. Was fehlt dir denn? Wo tut es weh?"
        : "Guten Tag. Was fehlt Ihnen denn? Wo tut es weh?",
      opening_message_ar: du
        ? "أهلًا. مالك؟ فيه إيه؟"
        : "نهارك سعيد. حضرتك مالك؟ الألم فين؟",
    };
  }

  return {
    title_de: "Im Alltag ins Gespräch kommen",
    title_ar: "كلام في الحياة اليومية",
    emoji: "💬",
    setting_ar:
      "قعدة بسيطة مع شخص ودود في حي سكني في برلين، والكلام عن اليوم والخطة الجاية.",
    ai_role_de: "freundliche Nachbarin, die ein kurzes Alltagsgespräch führt",
    learner_role_ar: "جار جديد عايز يتكلم عن يومه وخططه",
    goal_ar: "اتكلم عن يومك، واسأل عن يوم الطرف التاني، واقترح حاجة نعملها.",
    level,
    formality,
    grammar_focus: [
      du ? "du-Form" : "Höflichkeitsform Sie",
      "W-Fragen",
      "Verb an Position 2",
    ],
    key_vocab: [
      { de: "Tag", article: "der", plural: "die Tage", ar: "يوم" },
      { de: "Wochenende", article: "das", plural: "die Wochenenden", ar: "آخر الأسبوع" },
      { de: "Idee", article: "die", plural: "die Ideen", ar: "فكرة" },
    ],
    useful_phrases: [
      { de: "Wie war dein Tag?", ar: "يومك كان إيه؟" },
      { de: "Hast du Lust, …?", ar: "تحب …؟" },
    ],
    opening_message_de: du
      ? "Hallo! Schön, dich zu sehen. Wie war dein Tag?"
      : "Guten Tag! Schön, Sie zu sehen. Wie war Ihr Tag?",
    opening_message_ar: du
      ? "أهلًا! حلو إننا شوفناك. يومك كان إيه؟"
      : "نهارك سعيد! حلو إننا شوفناك. يوم حضرتك كان إيه؟",
  };
}

class DemoGateway implements AiGateway {
  readonly mode = "demo" as const;

  async tutor(input: {
    level: Level;
    dialect: Dialect;
    safeMode: boolean;
    learnerMessage: string;
    history: HistoryMessage[];
    scenario: ApiScenario;
  }): Promise<TutorResponse> {
    const assistantTurns = input.history.filter((item) => item.role === "assistant").length;
    const { corrected, mistakes } = normalizeDemoCorrection(input.learnerMessage);
    const correction = {
      corrected,
      isCorrect: mistakes.length === 0,
      mistakes,
      praise_ar:
        mistakes.length > 0
          ? praiseOptions[0] ?? "حلو إنك حاولت!"
          : `${praiseOptions[2] ?? "مجهود جميل!"} ومفيش أخطاء أساسية في الجملة دي.`,
    };

    // Custom scenarios have no canned per-id replies. Keep the demo flow
    // deterministic while still respecting the learner's chosen formality.
    if (input.scenario.id === "custom") {
      const du = input.scenario.formality === "du";
      const customTurns = du
        ? [
            {
              reply_de:
                "Danke für deine Nachricht! Das passt gut. Was möchtest du jetzt machen?",
              question_de: "Was möchtest du jetzt machen?",
              translation_ar:
                "شكرًا على رسالتك! ده مناسب للسياق. تحب تعمل إيه دلوقتي؟",
            },
            {
              reply_de: "Verstehe. Möchtest du noch etwas dazu sagen?",
              question_de: "Möchtest du noch etwas dazu sagen?",
              translation_ar: "فاهمة. تحب تقول حاجة تانية عن الموضوع؟",
            },
            {
              reply_de: "Gut gemacht! Was möchtest du als Nächstes üben?",
              question_de: "Was möchtest du als Nächstes üben?",
              translation_ar: "عملت كويس! تحب تتدرب على إيه بعد كده؟",
            },
          ]
        : [
            {
              reply_de:
                "Danke für Ihre Nachricht! Das passt gut. Was möchten Sie jetzt machen?",
              question_de: "Was möchten Sie jetzt machen?",
              translation_ar:
                "شكرًا على رسالتك! ده مناسب للسياق. تحب تعمل إيه دلوقتي؟",
            },
            {
              reply_de: "Verstehe. Möchten Sie noch etwas dazu sagen?",
              question_de: "Möchten Sie noch etwas dazu sagen?",
              translation_ar: "فاهمة. تحب تقول حاجة تانية عن الموضوع؟",
            },
            {
              reply_de: "Gut gemacht! Was möchten Sie als Nächstes üben?",
              question_de: "Was möchten Sie als Nächstes üben?",
              translation_ar: "عملت كويس! تحب تتدرب على إيه بعد كده؟",
            },
          ];
      const chosen = customTurns[assistantTurns % customTurns.length] ?? customTurns[0]!;
      const safeSuffix =
        input.safeMode && input.level !== "A1" ? " (سنكلم بهدوء أكثر)" : "";

      return {
        reply_de: chosen.reply_de,
        translation_ar: chosen.translation_ar + safeSuffix,
        correction: {
          ...correction,
          follow_up_question_de: chosen.question_de,
        },
        vocabulary: [],
      };
    }

    if (input.scenario.id === "free") {
      const freeTurns = [
        {
          reply_de: "Das ist interessant! Erzähl mir mehr dazu.",
          question_de: "Was genau meinst du?",
          translation_ar: "مثير للاهتمام! أخبرني أكثر عن ذلك.",
        },
        {
          reply_de: "Gut gesagt. Wie würdest du das auf Deutsch ausdrücken?",
          question_de: "Wie würdest du das auf Deutsch ausdrücken?",
          translation_ar: "جميل. كيف تعبّر عن ذلك بالألمانية؟",
        },
        {
          reply_de: "Sehr gut! Möchtest du noch etwas hinzufügen?",
          question_de: "Möchtest du noch etwas hinzufügen?",
          translation_ar: "ممتاز! تحب تضيف anything؟",
        },
      ];
      const chosen = freeTurns[assistantTurns % freeTurns.length] ?? freeTurns[0]!;
      const safeSuffix =
        input.safeMode && input.level !== "A1" ? " (سنكلم بهدوء أكثر)" : "";
      return {
        reply_de: chosen.reply_de,
        translation_ar: chosen.translation_ar + safeSuffix,
        correction: { ...correction, follow_up_question_de: chosen.question_de },
        vocabulary: [],
      };
    }

    const turns = demoReplies[input.scenario.id] ?? demoReplies.cafe ?? [];
    const chosen = turns[assistantTurns % Math.max(1, turns.length)] ?? turns[0];
    if (!chosen) {
      throw new AppError(500, "demo_missing", "Demo scenario is unavailable.");
    }

    const safeSuffix =
      input.safeMode && input.level !== "A1" ? " (سنكلم بهدوء أكثر)" : "";

    return {
      reply_de: chosen.reply_de,
      translation_ar: chosen.translation_ar + safeSuffix,
      correction: {
        ...correction,
        follow_up_question_de: chosen.question_de,
      },
      vocabulary: (demoVocabulary[input.scenario.id] ?? []).slice(0, 2),
    };
  }

  async assist(
    action: AssistAction,
    _text: string,
    _level: Level,
    _dialect: Dialect,
  ): Promise<ExplainResponse | SimplifyResponse | TranslateResponse> {
    if (action === "explain") {
      return {
        explanation_ar:
          "إحنا في الوضع التجريبي، فالشرح الدقيق للجملة دي مش متاح. لما يتظبط مزوّد الذكاء الاصطناعي، هنا هتلاقي شرح مبني على الجملة نفسها مع مقارنة بالعربي.",
        examples: [
          { de: "Das ist ein Beispiel.", ar: "دي مثال." },
          { de: "Der Satz ist einfach.", ar: "الجملة بسيطة." },
        ],
      };
    }
    if (action === "simplify") {
      return {
        simplified_de: "Bitte sprich langsam. Ich verstehe dich noch nicht.",
        translation_ar:
          "من فضلك اتكلم ببطء. أنا لسه مش فاهمك. (دي نسخة تجريبية للتبسيط.)",
      };
    }
    return {
      translation_ar:
        "الترجمة الدقيقة مش متاحة في الوضع التجريبي. فعّل مزوّد الذكاء الاصطناعي وهتلاقي ترجمة طبيعية بالعربي المصري.",
    };
  }

  async word(word: string, _context: string, _level: Level): Promise<WordResponse> {
    return (
      {
        word,
        article: null,
        plural: null,
        part_of_speech: "Demo",
        meaning_ar:
          "الوضع التجريبي مش بيدّي معنى دقيق. فعّل مزوّد الذكاء الاصطناعي عشان تشوف المعنى والأداة والجمع.",
        meaning_en: "Precise dictionary lookup is unavailable in demo mode.",
        example_de: "Im Demo-Modus gibt es kein Wörterbuch.",
        example_ar: "في الوضع التجريبي مفيش قاموس دقيق.",
      } satisfies WordResponse
    );
  }

  async generateScenario(input: {
    idea: string;
    level?: Level;
    formality?: Formality;
  }): Promise<ScenarioModelResponse> {
    if (demoScenarioRefusalPattern.test(input.idea)) {
      return { refused_ar: demoScenarioRefusalMessage };
    }
    return pickDemoScenario(input);
  }

  async generateDrills(input: {
    topic: DrillTopic;
    level: Level;
    weakSpots: DrillWeakSpot[];
    count: number;
    excludePrompts?: string[];
  }): Promise<DrillBatchModel> {
    return {
      questions: pickBankDrillQuestions({
        topic: input.topic,
        level: input.level,
        count: input.count,
        excludePrompts: input.excludePrompts,
      }),
    };
  }
}

let gateway: AiGateway | null = null;

export function getAiGateway(): AiGateway {
  if (gateway) return gateway;
  if (config.aiMode === "demo") {
    gateway = new DemoGateway();
  } else if (config.aiMode === "live") {
    gateway =
      config.aiProvider === "gemini"
        ? new GeminiGateway(config.geminiApiKey, config.geminiModel)
        : new AnthropicGateway(config.anthropicApiKey);
  } else {
    throw new AppError(
      503,
      "ai_not_configured",
      "The AI tutor is not configured on this server.",
    );
  }
  return gateway;
}
