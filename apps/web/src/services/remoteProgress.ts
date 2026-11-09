import type {
  CefrLevel,
  ChatMessage,
  Conversation,
  DailyActivity,
  DrillResult,
  GrammarArticle,
  GrammarTopic,
  NativeDialect,
  ProgressState,
  ScenarioId,
  ThemeMode,
  UiLanguage,
  VocabCard,
  VocabSuggestion,
  WeakSpot,
  Mistake,
} from "@/types/domain";
import { supabase } from "@/services/supabaseClient";

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  level: string | null;
  daily_goal_minutes: number | null;
  ui_language: string | null;
  native_dialect: string | null;
  theme: string | null;
  onboarding_completed: boolean | null;
  xp: number | null;
  created_at: string | null;
}

interface WeakSpotRow {
  id: string;
  topic: string;
  pattern: string;
  label_ar: string;
  label_en: string;
  count: number;
  last_seen: string;
}

interface VocabRow {
  id: string;
  word: string;
  article: string | null;
  plural: string | null;
  translation_ar: string;
  translation_en: string;
  example_de: string;
  example_ar: string;
  level: string;
  category: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_date: string;
  created_at: string;
  last_reviewed_at: string | null;
  source: string;
}

interface DrillRow {
  id: string;
  topic: string;
  pattern: string;
  question_id: string;
  correct: boolean;
  created_at: string;
}

interface ConversationRow {
  id: string;
  scenario_id: string;
  started_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content_de: string;
  translation_ar: string | null;
  correction: null;
  vocabulary: unknown;
  is_starter: boolean | null;
  mode: string | null;
  created_at: string;
}

interface CorrectionRow {
  id: string;
  message_id: string;
  corrected: string;
  praise_ar: string;
  mistakes: unknown;
  follow_up_question_de: string;
}

interface StreakRow {
  current_streak: number | null;
  longest_streak: number | null;
  last_practice_date: string | null;
}

interface ActivityRow {
  date: string;
  xp: number | null;
  seconds: number | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const LEVELS = new Set<CefrLevel>(["A1", "A2", "B1"]);
const DIALECTS = new Set<NativeDialect>([
  "egyptian",
  "levantine",
  "gulf",
  "maghrebi",
  "msa",
  "other",
]);
const TOPICS = new Set<GrammarTopic>([
  "articles",
  "cases",
  "word_order",
  "vocabulary",
  "prepositions",
]);
const SCENARIOS = new Set<ScenarioId>([
  "cafe",
  "doctor",
  "interview",
  "office",
  "shopping",
]);
const ARTICLES = new Set<GrammarArticle>(["der", "die", "das"]);

function asLevel(value: string | null | undefined): CefrLevel {
  return value && LEVELS.has(value as CefrLevel) ? (value as CefrLevel) : "A1";
}

function asDialect(value: string | null | undefined): NativeDialect {
  return value && DIALECTS.has(value as NativeDialect)
    ? (value as NativeDialect)
    : "egyptian";
}

function asTopic(value: string): GrammarTopic {
  return TOPICS.has(value as GrammarTopic) ? (value as GrammarTopic) : "cases";
}

function asArticle(value: string | null): GrammarArticle | null {
  return value && ARTICLES.has(value as GrammarArticle)
    ? (value as GrammarArticle)
    : null;
}

function asTheme(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function asUiLanguage(value: string | null | undefined): UiLanguage {
  return value === "en" ? "en" : "ar";
}

function asScenario(value: string): ScenarioId {
  if (SCENARIOS.has(value as ScenarioId)) return value as ScenarioId;
  if (/^custom_[A-Za-z0-9_-]+$/.test(value)) return value as ScenarioId;
  return "cafe";
}

function asDate(value: string | null | undefined, fallback: string): string {
  return value ?? fallback;
}

function asMistakes(value: unknown): Mistake[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Mistake => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<Mistake>;
    return (
      typeof candidate.type === "string" &&
      typeof candidate.original === "string" &&
      typeof candidate.fix === "string" &&
      typeof candidate.explanation_ar === "string"
    );
  });
}

function asSuggestions(value: unknown): VocabSuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value.filter((item): item is VocabSuggestion => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<VocabSuggestion>;
    return typeof candidate.word === "string" && typeof candidate.translation_ar === "string";
  });
  return parsed.length > 0 ? parsed : undefined;
}

function throwIfError(error: { message: string; code?: string } | null): void {
  if (error) {
    const wrapped = new Error(error.message);
    wrapped.name = `SupabaseError:${error.code ?? "unknown"}`;
    throw wrapped;
  }
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/* ------------------------------------------------------------------ */
/* Load                                                                */
/* ------------------------------------------------------------------ */

export async function loadRemoteProgress(userId: string): Promise<ProgressState | null> {
  if (!supabase) return null;

  const [
    profileResult,
    weakResult,
    vocabResult,
    drillResult,
    conversationResult,
    streakResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("weak_spots").select("*").eq("user_id", userId),
    supabase.from("vocab_cards").select("*").eq("user_id", userId).order("created_at"),
    supabase
      .from("drill_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2_000),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_activity").select("*").eq("user_id", userId).order("date"),
  ]);

  for (const result of [
    profileResult,
    weakResult,
    vocabResult,
    drillResult,
    conversationResult,
    streakResult,
    activityResult,
  ]) {
    throwIfError(result.error);
  }

  const profile = profileResult.data as unknown as ProfileRow | null;
  if (!profile) return null;

  const conversations = (conversationResult.data ?? []) as unknown as ConversationRow[];
  const conversationIds = conversations.map((conversation) => conversation.id);

  let messageRows: MessageRow[] = [];
  let correctionRows: CorrectionRow[] = [];

  if (conversationIds.length > 0) {
    const [messagesResult, correctionsResult] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
        .limit(4_000),
      supabase
        .from("corrections")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(2_000),
    ]);
    throwIfError(messagesResult.error);
    throwIfError(correctionsResult.error);
    messageRows = (messagesResult.data ?? []) as unknown as MessageRow[];
    correctionRows = (correctionsResult.data ?? []) as unknown as CorrectionRow[];
  }

  const correctionsByMessage = new Map<string, CorrectionRow>();
  for (const correction of correctionRows) {
    correctionsByMessage.set(correction.message_id, correction);
  }

  const messagesByConversation = new Map<string, ChatMessage[]>();
  for (const row of messageRows) {
    const correctionRow = correctionsByMessage.get(row.id);
    const message: ChatMessage = {
      id: row.id,
      role: row.role === "assistant" ? "assistant" : "user",
      content: row.content_de,
      createdAt: row.created_at,
      ...(row.translation_ar ? { translationAr: row.translation_ar } : {}),
      ...(correctionRow
        ? {
            correction: {
              corrected: correctionRow.corrected,
              mistakes: asMistakes(correctionRow.mistakes),
              praise_ar: correctionRow.praise_ar,
              follow_up_question_de: correctionRow.follow_up_question_de,
            },
          }
        : {}),
      ...(asSuggestions(row.vocabulary) ? { vocabulary: asSuggestions(row.vocabulary) } : {}),
      ...(row.is_starter ? { isStarter: true } : {}),
      ...(row.mode === "demo" || row.mode === "live" ? { mode: row.mode } : {}),
    };
    const current = messagesByConversation.get(row.conversation_id) ?? [];
    current.push(message);
    messagesByConversation.set(row.conversation_id, current);
  }

  const mappedConversations: Conversation[] = conversations.map((conversation) => ({
    id: conversation.id,
    scenarioId: asScenario(conversation.scenario_id),
    messages: messagesByConversation.get(conversation.id) ?? [],
    startedAt: conversation.started_at,
    updatedAt: conversation.updated_at,
  }));

  const vocabCards: VocabCard[] = ((vocabResult.data ?? []) as unknown as VocabRow[]).map(
    (row) => ({
      id: row.id,
      word: row.word,
      article: asArticle(row.article),
      plural: row.plural,
      translationAr: row.translation_ar,
      translationEn: row.translation_en,
      exampleDe: row.example_de,
      exampleAr: row.example_ar,
      level: asLevel(row.level),
      category: (row.category || "home") as VocabCard["category"],
      ease: Number(row.ease) || 2.5,
      intervalDays: Number(row.interval_days) || 0,
      repetitions: Number(row.repetitions) || 0,
      dueDate: row.due_date,
      createdAt: row.created_at,
      lastReviewedAt: row.last_reviewed_at,
      source:
        row.source === "chat" || row.source === "manual" ? row.source : "seed",
    }),
  );

  const weakSpots: WeakSpot[] = ((weakResult.data ?? []) as unknown as WeakSpotRow[]).map(
    (row) => ({
      id: row.id,
      topic: asTopic(row.topic),
      pattern: row.pattern,
      labelAr: row.label_ar,
      labelEn: row.label_en,
      count: Number(row.count) || 0,
      lastSeen: row.last_seen,
    }),
  );

  const drillResults: DrillResult[] = (
    (drillResult.data ?? []) as unknown as DrillRow[]
  ).map((row) => ({
    id: row.id,
    topic: asTopic(row.topic),
    pattern: row.pattern,
    questionId: row.question_id,
    correct: Boolean(row.correct),
    createdAt: row.created_at,
  }));

  const activity: DailyActivity[] = (
    (activityResult.data ?? []) as unknown as ActivityRow[]
  ).map((row) => ({
    date: row.date,
    xp: Number(row.xp) || 0,
    seconds: Number(row.seconds) || 0,
  }));

  const streak = streakResult.data as unknown as StreakRow | null;

  return {
    version: 1,
    ownerId: userId,
    profile: {
      displayName: profile.display_name ?? "",
      level: asLevel(profile.level),
      dailyGoalMinutes: Number(profile.daily_goal_minutes) || 20,
      uiLanguage: asUiLanguage(profile.ui_language),
      nativeDialect: asDialect(profile.native_dialect),
      theme: asTheme(profile.theme),
      onboardingCompleted: Boolean(profile.onboarding_completed),
      createdAt: asDate(profile.created_at, new Date().toISOString()),
    },
    xp: Number(profile.xp) || 0,
    weakSpots,
    vocabCards,
    drillResults,
    conversations: mappedConversations,
    activity,
    streak: {
      current: Number(streak?.current_streak) || 0,
      longest: Number(streak?.longest_streak) || 0,
      lastPracticeDate: streak?.last_practice_date ?? null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export async function saveRemoteProgress(
  state: ProgressState,
  userId: string,
): Promise<void> {
  if (!supabase) return;

  const now = new Date().toISOString();
  const profileRow = {
    user_id: userId,
    display_name: state.profile.displayName,
    level: state.profile.level,
    daily_goal_minutes: state.profile.dailyGoalMinutes,
    ui_language: state.profile.uiLanguage,
    native_dialect: state.profile.nativeDialect,
    theme: state.profile.theme,
    onboarding_completed: state.profile.onboardingCompleted,
    xp: state.xp,
    created_at: state.profile.createdAt,
    updated_at: now,
  };

  const profileResult = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  throwIfError(profileResult.error);

  const weakRows = state.weakSpots.map((spot) => ({
    id: spot.id,
    user_id: userId,
    topic: spot.topic,
    pattern: spot.pattern,
    label_ar: spot.labelAr,
    label_en: spot.labelEn,
    count: spot.count,
    last_seen: spot.lastSeen,
  }));

  const vocabRows = state.vocabCards.map((card) => ({
    id: card.id,
    user_id: userId,
    word: card.word,
    article: card.article,
    plural: card.plural,
    translation_ar: card.translationAr,
    translation_en: card.translationEn,
    example_de: card.exampleDe,
    example_ar: card.exampleAr,
    level: card.level,
    category: card.category,
    ease: card.ease,
    interval_days: card.intervalDays,
    repetitions: card.repetitions,
    due_date: card.dueDate,
    created_at: card.createdAt,
    last_reviewed_at: card.lastReviewedAt,
    source: card.source,
  }));

  const drillRows = state.drillResults.map((result) => ({
    id: result.id,
    user_id: userId,
    topic: result.topic,
    pattern: result.pattern,
    question_id: result.questionId,
    correct: result.correct,
    created_at: result.createdAt,
  }));

  const activityRows = state.activity.map((day) => ({
    user_id: userId,
    date: day.date,
    xp: day.xp,
    seconds: day.seconds,
  }));

  await Promise.all([
    weakRows.length > 0
      ? supabase.from("weak_spots").upsert(weakRows, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    vocabRows.length > 0
      ? supabase.from("vocab_cards").upsert(vocabRows, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    drillRows.length > 0
      ? supabase.from("drill_results").upsert(drillRows, { onConflict: "id" })
      : Promise.resolve({ error: null }),
    activityRows.length > 0
      ? supabase
          .from("daily_activity")
          .upsert(activityRows, { onConflict: "user_id,date" })
      : Promise.resolve({ error: null }),
    supabase.from("streaks").upsert(
      {
        user_id: userId,
        current_streak: state.streak.current,
        longest_streak: state.streak.longest,
        last_practice_date: state.streak.lastPracticeDate,
        updated_at: now,
      },
      { onConflict: "user_id" },
    ),
  ]).then((results) => {
    for (const result of results) {
      throwIfError((result as { error: { message: string } | null }).error);
    }
  });

  const conversationRows = state.conversations.map((conversation) => ({
    id: conversation.id,
    user_id: userId,
    scenario_id: conversation.scenarioId,
    started_at: conversation.startedAt,
    updated_at: conversation.updatedAt,
  }));

  if (conversationRows.length > 0) {
    const result = await supabase
      .from("conversations")
      .upsert(conversationRows, { onConflict: "id" });
    throwIfError(result.error);
  }

  const messageRows = state.conversations.flatMap((conversation) =>
    conversation.messages.map((message) => ({
      id: message.id,
      user_id: userId,
      conversation_id: conversation.id,
      role: message.role,
      content_de: message.content,
      translation_ar: message.translationAr ?? null,
      vocabulary: message.vocabulary ?? null,
      is_starter: message.isStarter ?? false,
      mode: message.mode ?? null,
      created_at: message.createdAt,
    })),
  );

  const correctionRows = state.conversations.flatMap((conversation) =>
    conversation.messages.flatMap((message) =>
      message.correction
        ? [
            {
              id: `corr_${message.id}`,
              user_id: userId,
              message_id: message.id,
              corrected: message.correction.corrected,
              praise_ar: message.correction.praise_ar,
              mistakes: message.correction.mistakes,
              follow_up_question_de: message.correction.follow_up_question_de,
              created_at: message.createdAt,
            },
          ]
        : [],
    ),
  );

  // Chunk messages/corrections to stay well under request size limits.
  for (const batch of chunk(messageRows, 200)) {
    const result = await supabase.from("messages").upsert(batch, { onConflict: "id" });
    throwIfError(result.error);
  }
  for (const batch of chunk(correctionRows, 200)) {
    const result = await supabase
      .from("corrections")
      .upsert(batch, { onConflict: "id" });
    throwIfError(result.error);
  }
}

export async function deleteRemoteProgress(userId: string): Promise<void> {
  if (!supabase) return;
  const tables = [
    "corrections",
    "messages",
    "conversations",
    "drill_results",
    "weak_spots",
    "vocab_cards",
    "daily_activity",
    "streaks",
  ] as const;
  for (const table of tables) {
    const result = await supabase.from(table).delete().eq("user_id", userId);
    throwIfError(result.error);
  }
  // Profiles are reset by the next sync (we keep the auth-linked row so the
  // trigger/foreign keys remain predictable).
}
