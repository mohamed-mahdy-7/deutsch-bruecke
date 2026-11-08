import Anthropic from "@anthropic-ai/sdk";
import type { ZodType, ZodTypeDef } from "zod";
import { config } from "../config.js";
import { parseJsonObject } from "../lib/json.js";
import {
  explainResponseSchema,
  simplifyResponseSchema,
  translateResponseSchema,
  tutorResponseSchema,
  wordResponseSchema,
  type AssistAction,
  type ExplainResponse,
  type SimplifyResponse,
  type TranslateResponse,
  type TutorResponse,
  type WordResponse,
} from "../schemas.js";
import { buildTutorSystemPrompt, buildTutorRepairPrompt, buildTutorUserTurn } from "../prompts/tutor.js";
import {
  buildAssistSystemPrompt,
  buildAssistUserPrompt,
  buildWordSystemPrompt,
  buildWordUserPrompt,
} from "../prompts/assist.js";
import type { ApiScenario } from "../data/scenarios.js";
import { AppError } from "../lib/errors.js";

type Level = "A1" | "A2" | "B1";
type Dialect = "egyptian" | "levantine" | "gulf" | "maghrebi" | "msa" | "other";
type Role = "user" | "assistant";
interface HistoryMessage {
  role: Role;
  content: string;
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
}

class AnthropicGateway implements AiGateway {
  readonly mode = "live" as const;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      maxRetries: 1,
      timeout: 30_000,
    });
  }

  private async requestJson<T>(
    system: string,
    messages: Anthropic.MessageParam[],
    schema: ZodType<T, ZodTypeDef, unknown>,
    repairInstruction: string,
  ): Promise<T> {
    let repairMessages = messages;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await this.client.messages.create({
        model: config.anthropicModel,
        max_tokens: 1_800,
        temperature: 0.45,
        system,
        messages: repairMessages,
      });

      const raw = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!raw) {
        if (attempt === 0) {
          repairMessages = [
            ...messages,
            { role: "assistant", content: "(empty response)" },
            { role: "user", content: repairInstruction },
          ];
          continue;
        }
        throw new AppError(
          502,
          "ai_empty_response",
          "The tutor could not generate a reply. Please try again.",
        );
      }

      try {
        const parsed = schema.parse(parseJsonObject(raw));
        return parsed;
      } catch (error) {
        console.warn(
          `[ai] Invalid structured response on attempt ${attempt + 1}:`,
          error instanceof Error ? error.message : "unknown",
        );
        if (attempt === 0) {
          repairMessages = [
            ...messages,
            { role: "assistant", content: raw.slice(0, 6_000) },
            { role: "user", content: repairInstruction },
          ];
          continue;
        }
        throw new AppError(
          502,
          "ai_format_error",
          "The tutor's answer could not be processed. Please try once more.",
        );
      }
    }

    throw new AppError(
      502,
      "ai_format_error",
      "The tutor's answer could not be processed. Please try once more.",
    );
  }

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

    // Merge adjacent same-role turns because the Anthropic Messages API
    // expects an alternating conversation, and truncate overly long history.
    const normalizedHistory: Anthropic.MessageParam[] = [];
    for (const item of input.history.slice(-10)) {
      const previous = normalizedHistory.at(-1);
      if (previous && previous.role === item.role) {
        previous.content = `${String(previous.content)}\n${item.content}`;
      } else {
        normalizedHistory.push({
          role: item.role,
          content: item.content,
        });
      }
    }
    if (normalizedHistory.at(-1)?.role === "user") {
      normalizedHistory.pop();
    }

    return this.requestJson(
      system,
      [
        ...normalizedHistory,
        { role: "user", content: buildTutorUserTurn(input.learnerMessage) },
      ],
      tutorResponseSchema,
      buildTutorRepairPrompt(),
    );
  }

  async assist(
    action: AssistAction,
    text: string,
    level: Level,
    dialect: Dialect,
  ): Promise<ExplainResponse | SimplifyResponse | TranslateResponse> {
    const system = buildAssistSystemPrompt(action, level, dialect);
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildAssistUserPrompt(text) },
    ];
    const repairInstruction = "Return only the exact JSON shape requested. No markdown.";

    // Call requestJson per branch so TypeScript can infer each schema's exact
    // output type. A union of Zod schemas would collapse to the first member.
    if (action === "explain") {
      return this.requestJson(system, messages, explainResponseSchema, repairInstruction);
    }
    if (action === "simplify") {
      return this.requestJson(system, messages, simplifyResponseSchema, repairInstruction);
    }
    return this.requestJson(system, messages, translateResponseSchema, repairInstruction);
  }

  async word(word: string, context: string, level: Level): Promise<WordResponse> {
    return this.requestJson(
      buildWordSystemPrompt(level),
      [{ role: "user", content: buildWordUserPrompt(word, context) }],
      wordResponseSchema,
      "Return only the exact JSON object requested, with article and plural included for nouns. No markdown.",
    );
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
    const turns = demoReplies[input.scenario.id] ?? demoReplies.cafe ?? [];
    const assistantTurns = input.history.filter((item) => item.role === "assistant").length;
    const chosen = turns[assistantTurns % Math.max(1, turns.length)] ?? turns[0];
    if (!chosen) {
      throw new AppError(500, "demo_missing", "Demo scenario is unavailable.");
    }

    const { corrected, mistakes } = normalizeDemoCorrection(input.learnerMessage);
    const safeSuffix =
      input.safeMode && input.level !== "A1" ? " (سنكلم بهدوء أكثر)" : "";

    return {
      reply_de: chosen.reply_de,
      translation_ar: chosen.translation_ar + safeSuffix,
      correction: {
        corrected,
        mistakes,
        praise_ar:
          mistakes.length > 0
            ? praiseOptions[0] ?? "حلو إنك حاولت!"
            : `${praiseOptions[2] ?? "مجهود جميل!"} ومفيش أخطاء أساسية في الجملة دي.`,
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
          "إحنا في الوضع التجريبي، فالشرح الدقيق للجملة دي مش متاح. لما يتضاف مفتاح Claude، هنا هتلاقي شرح مبني على الجملة نفسها مع مقارنة بالعربي.",
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
        "الترجمة الدقيقة مش متاحة في الوضع التجريبي. فعّل Claude وهتلاقي ترجمة طبيعية بالعربي المصري.",
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
          "الوضع التجريبي مش بيدّي معنى دقيق. فعّل مفتاح Anthropic عشان تشوف المعنى والأداة والجمع.",
        meaning_en: "Precise dictionary lookup is unavailable in demo mode.",
        example_de: "Im Demo-Modus gibt es kein Wörterbuch.",
        example_ar: "في الوضع التجريبي مفيش قاموس دقيق.",
      } satisfies WordResponse
    );
  }
}

let gateway: AiGateway | null = null;

export function getAiGateway(): AiGateway {
  if (gateway) return gateway;
  if (config.aiMode === "live") {
    gateway = new AnthropicGateway(config.anthropicApiKey);
  } else if (config.aiMode === "demo") {
    gateway = new DemoGateway();
  } else {
    throw new AppError(
      503,
      "ai_not_configured",
      "The AI tutor is not configured on this server.",
    );
  }
  return gateway;
}
