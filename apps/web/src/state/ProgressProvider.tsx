import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/state/AuthProvider";
import {
  createDefaultProgress,
  GUEST_OWNER_ID,
} from "@/state/progressFactory";
import { mergeProgress } from "@/state/mergeProgress";
import {
  clearLocalProgress,
  readLocalProgress,
  writeLocalProgress,
} from "@/services/localStore";
import {
  deleteRemoteProgress,
  loadRemoteProgress,
  saveRemoteProgress,
} from "@/services/remoteProgress";
import type {
  CefrLevel,
  ChatMessage,
  Conversation,
  Correction,
  GrammarTopic,
  MistakeType,
  NativeDialect,
  Profile,
  ProgressState,
  Scenario,
  SrsQuality,
  UiLanguage,
  VocabCard,
  VocabSuggestion,
} from "@/types/domain";
import { addWeakSpotToState } from "./progressMutations";
import {
  addPracticeActivity,
  createChatMessage,
  mergeCorrectionIntoMessage,
  normalizeVocabWord,
} from "./progressMutations";
import { gradeVocabCard } from "@/lib/srs";
import { createId } from "@/lib/utils";
import { dateKey } from "@/lib/dates";

export type SyncStatus = "local" | "syncing" | "synced" | "error";

export interface OnboardingData {
  displayName: string;
  level: CefrLevel;
  dailyGoalMinutes: number;
  uiLanguage: UiLanguage;
  nativeDialect: NativeDialect;
}

export interface NewVocabInput {
  word: string;
  article: VocabCard["article"];
  plural: string | null;
  translationAr: string;
  translationEn?: string;
  exampleDe: string;
  exampleAr?: string;
  source?: VocabCard["source"];
}

export interface DrillAnswerInput {
  questionId: string;
  topic: GrammarTopic;
  pattern: string;
  correct: boolean;
  labelAr: string;
  labelEn: string;
  xpCorrect?: number;
  xpIncorrect?: number;
}

export interface CompleteTutorTurnInput {
  conversationId: string;
  userMessageId: string;
  correction: Correction;
  replyDe: string;
  translationAr?: string;
  vocabulary?: VocabSuggestion[];
  mode: "live" | "demo";
}

interface AddWeakSpotInput {
  topic: GrammarTopic;
  pattern: string;
  labelAr: string;
  labelEn: string;
}

interface ProgressContextValue {
  progress: ProgressState | null;
  loading: boolean;
  syncStatus: SyncStatus;
  updateProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: (data: OnboardingData) => void;
  recordDrillAnswer: (input: DrillAnswerInput) => void;
  addVocabCard: (input: NewVocabInput) => boolean;
  reviewVocabCard: (cardId: string, quality: SrsQuality) => void;
  ensureConversation: (scenario: Scenario) => Conversation | null;
  startNewConversation: (scenario: Scenario) => Conversation | null;
  appendUserMessage: (conversationId: string, content: string) => ChatMessage | null;
  completeTutorTurn: (input: CompleteTutorTurnInput) => void;
  resetProgress: () => Promise<void>;
  retrySync: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const CHAT_MISTAKE_META: Partial<
  Record<MistakeType, { topic: GrammarTopic; labelAr: string; labelEn: string }>
> = {
  article: { topic: "articles", labelAr: "أدوات الاسم (der/die/das)", labelEn: "Noun articles" },
  case: { topic: "cases", labelAr: "حالات الإعراب", labelEn: "German cases" },
  verb_position: { topic: "word_order", labelAr: "مكان الفعل", labelEn: "Verb position" },
  verb_conjugation: {
    topic: "word_order",
    labelAr: "تصريف الأفعال",
    labelEn: "Verb conjugation",
  },
  word_order: { topic: "word_order", labelAr: "ترتيب الكلمات", labelEn: "Word order" },
  preposition: {
    topic: "prepositions",
    labelAr: "حروف الجر",
    labelEn: "Prepositions",
  },
  vocabulary: { topic: "vocabulary", labelAr: "اختيار المفردات", labelEn: "Vocabulary" },
  spelling: { topic: "vocabulary", labelAr: "الإملاء الألماني", labelEn: "German spelling" },
};

function buildOpeningMessage(scenario: Scenario, now: Date): ChatMessage {
  return {
    id: createId("msg"),
    role: "assistant",
    content: scenario.openingDe,
    translationAr: scenario.openingAr,
    createdAt: now.toISOString(),
    isStarter: true,
  };
}

function makeNewConversation(scenario: Scenario, now: Date): Conversation {
  return {
    id: createId("conv"),
    scenarioId: scenario.id,
    messages: [buildOpeningMessage(scenario, now)],
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function addWeakSpotsBatch(
  state: ProgressState,
  additions: AddWeakSpotInput[],
  now: Date,
): ProgressState {
  let next = state;
  const seen = new Set<string>();
  for (const addition of additions) {
    const key = `${addition.topic}::${addition.pattern}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next = addWeakSpotToState(next, addition, now);
  }
  return next;
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { mode: authMode, user } = useAuth();
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const progressRef = useRef<ProgressState | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<ProgressState | null>(null);
  const syncInFlightRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const syncAllowedRef = useRef(false);
  const initializedKeyRef = useRef<string | null>(null);
  const flushRemoteSyncRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const setProgressState = useCallback((next: ProgressState) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  const scheduleRemoteSync = useCallback((state: ProgressState) => {
    pendingSyncRef.current = state;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      void flushRemoteSyncRef.current();
    }, 2_000);
  }, []);

  const flushRemoteSync = useCallback(async () => {
    if (syncInFlightRef.current) return;
    if (!userIdRef.current || !syncAllowedRef.current) return;
    const snapshot = pendingSyncRef.current;
    if (!snapshot) return;

    pendingSyncRef.current = null;
    syncInFlightRef.current = true;
    setSyncStatus("syncing");
    try {
      await saveRemoteProgress(snapshot, userIdRef.current);
      setSyncStatus("synced");
    } catch (error) {
      console.warn("[sync] Remote progress sync failed:", error);
      setSyncStatus("error");
    } finally {
      syncInFlightRef.current = false;
      if (pendingSyncRef.current) {
        scheduleRemoteSync(pendingSyncRef.current);
      }
    }
  }, [scheduleRemoteSync]);
  flushRemoteSyncRef.current = flushRemoteSync;

  // Hydrate the right namespace whenever auth mode or account changes.
  useEffect(() => {
    if (authMode === "loading") return;

    const key =
      authMode === "authenticated" && user
        ? `user:${user.id}`
        : authMode === "guest"
          ? "guest"
          : "anonymous";

    if (initializedKeyRef.current === key) return;
    initializedKeyRef.current = key;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    pendingSyncRef.current = null;
    userIdRef.current = null;
    syncAllowedRef.current = false;

    if (authMode === "anonymous" || !user) {
      if (authMode === "guest") {
        const local = readLocalProgress();
        const next =
          local && local.ownerId === GUEST_OWNER_ID
            ? local
            : createDefaultProgress(GUEST_OWNER_ID);
        setProgressState(next);
        setSyncStatus("local");
        setLoading(false);
        return;
      }
      setProgress(null);
      progressRef.current = null;
      setSyncStatus("local");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setProgress(null);
    setSyncStatus("syncing");

    const metadata = user.user_metadata as { display_name?: unknown } | undefined;
    const suggestedName =
      typeof metadata?.display_name === "string" ? metadata.display_name.trim() : "";
    const local = readLocalProgress();
    const localMatchesUser = local?.ownerId === user.id;
    const localIsGuest = local?.ownerId === GUEST_OWNER_ID;

    const hydrate = async () => {
      try {
        const remote = await loadRemoteProgress(user.id);
        if (cancelled) return;

        let next: ProgressState;
        let remoteExists = Boolean(remote);

        if (remote) {
          next = localMatchesUser
            ? mergeProgress(remote, local)
            : remote;
          if (!next.profile.displayName && suggestedName) {
            next = {
              ...next,
              profile: { ...next.profile, displayName: suggestedName },
            };
          }
        } else if (local && (localMatchesUser || localIsGuest)) {
          next = {
            ...local,
            ownerId: user.id,
            profile: {
              ...local.profile,
              displayName: local.profile.displayName || suggestedName,
            },
          };
        } else {
          next = createDefaultProgress(user.id, suggestedName);
        }

        userIdRef.current = user.id;
        syncAllowedRef.current = true;
        setProgressState(next);
        setLoading(false);
        setSyncStatus(remoteExists ? "synced" : "syncing");

        if (!remoteExists) {
          try {
            await saveRemoteProgress(next, user.id);
            if (!cancelled) setSyncStatus("synced");
          } catch (error) {
            console.warn("[sync] Initial remote save failed:", error);
            if (!cancelled) setSyncStatus("error");
          }
        } else if (localMatchesUser) {
          // Local offline changes were merged; push them back once hydration
          // has settled. The state effect will also schedule a debounced sync.
        }
      } catch (error) {
        if (cancelled) return;
        console.warn("[sync] Remote progress load failed:", error);
        syncAllowedRef.current = false;
        userIdRef.current = user.id;
        const fallback =
          local && (localMatchesUser || localIsGuest)
            ? {
                ...local,
                ownerId: user.id,
                profile: {
                  ...local.profile,
                  displayName: local.profile.displayName || suggestedName,
                },
              }
            : createDefaultProgress(user.id, suggestedName);
        setProgressState(fallback);
        setLoading(false);
        setSyncStatus("error");
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [authMode, user, setProgressState]);

  // Persist locally on every change and debounce remote sync.
  useEffect(() => {
    if (!progress) return;
    writeLocalProgress(progress);

    if (authMode !== "authenticated" || !user) {
      if (authMode === "guest") setSyncStatus("local");
      return;
    }
    if (loading || !syncAllowedRef.current) return;
    scheduleRemoteSync(progress);
  }, [progress, authMode, user, loading, scheduleRemoteSync]);

  // Active practice time: one minute at a time, only while the tab is visible.
  useEffect(() => {
    if (loading || !progress || authMode === "anonymous" || authMode === "loading") {
      return;
    }
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setProgress((current) => {
        if (!current) return current;
        const next = addPracticeActivity(current, { xp: 0, seconds: 60 }, new Date());
        progressRef.current = next;
        return next;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [loading, authMode, progress?.ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProgress((current) => {
      if (!current) return current;
      const next = {
        ...current,
        profile: { ...current.profile, ...patch },
      };
      progressRef.current = next;
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((data: OnboardingData) => {
    setProgress((current) => {
      if (!current) return current;
      const next = {
        ...current,
        profile: {
          ...current.profile,
          ...data,
          onboardingCompleted: true,
        },
      };
      progressRef.current = next;
      return next;
    });
  }, []);

  const recordDrillAnswer = useCallback((input: DrillAnswerInput) => {
    setProgress((current) => {
      if (!current) return current;
      const now = new Date();
      const xpGain = input.correct
        ? (input.xpCorrect ?? 5)
        : (input.xpIncorrect ?? 1);

      let next: ProgressState = {
        ...current,
        drillResults: [
          ...current.drillResults,
          {
            id: createId("drill"),
            topic: input.topic,
            pattern: input.pattern,
            questionId: input.questionId,
            correct: input.correct,
            createdAt: now.toISOString(),
          },
        ],
      };

      if (!input.correct) {
        next = addWeakSpotToState(
          next,
          {
            topic: input.topic,
            pattern: input.pattern,
            labelAr: input.labelAr,
            labelEn: input.labelEn,
          },
          now,
        );
      }

      next = addPracticeActivity(next, { xp: xpGain, seconds: 0 }, now);
      progressRef.current = next;
      return next;
    });
  }, []);

  const addVocabCard = useCallback((input: NewVocabInput): boolean => {
    const current = progressRef.current;
    if (!current) return false;
    const word = normalizeVocabWord(input.word);
    if (!word) return false;
    const duplicate = current.vocabCards.some(
      (card) =>
        card.word.trim().toLowerCase() === word.toLowerCase() &&
        card.article === input.article,
    );
    if (duplicate) return false;

    const now = new Date();
    const newCard: VocabCard = {
      id: createId("vocab"),
      word,
      article: input.article,
      plural: input.plural,
      translationAr: input.translationAr.trim(),
      translationEn: (input.translationEn || input.translationAr).trim(),
      exampleDe: input.exampleDe.trim(),
      exampleAr: (input.exampleAr ?? "").trim(),
      level: current.profile.level,
      category: "other",
      ease: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueDate: now.toISOString(),
      createdAt: now.toISOString(),
      lastReviewedAt: null,
      source: input.source ?? "manual",
    };

    setProgress((state) => {
      if (!state) return state;
      const next = {
        ...state,
        vocabCards: [newCard, ...state.vocabCards],
      };
      progressRef.current = next;
      return next;
    });
    return true;
  }, []);

  const reviewVocabCard = useCallback((cardId: string, quality: SrsQuality) => {
    setProgress((current) => {
      if (!current) return current;
      const card = current.vocabCards.find((item) => item.id === cardId);
      if (!card) return current;
      const now = new Date();
      const updated = gradeVocabCard(card, quality, now);
      const correct = quality !== "again";
      const xpGain = correct ? 3 : 1;
      const label = card.article ? `${card.article} ${card.word}` : card.word;

      let next: ProgressState = {
        ...current,
        vocabCards: current.vocabCards.map((item) =>
          item.id === cardId ? updated : item,
        ),
        drillResults: [
          ...current.drillResults,
          {
            id: createId("drill"),
            topic: "vocabulary",
            pattern: `vocab:${card.id}`,
            questionId: `vocab:${card.id}`,
            correct,
            createdAt: now.toISOString(),
          },
        ],
      };

      if (!correct) {
        next = addWeakSpotToState(
          next,
          {
            topic: "vocabulary",
            pattern: `vocab:${card.id}`,
            labelAr: `كلمة: ${label}`,
            labelEn: `Word: ${label}`,
          },
          now,
        );
      }

      next = addPracticeActivity(next, { xp: xpGain, seconds: 0 }, now);
      progressRef.current = next;
      return next;
    });
  }, []);

  const ensureConversation = useCallback((scenario: Scenario): Conversation | null => {
    const current = progressRef.current;
    if (!current) return null;
    const existing = current.conversations
      .filter((conversation) => conversation.scenarioId === scenario.id)
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];

    if (existing) return existing;

    const now = new Date();
    const conversation = makeNewConversation(scenario, now);
    const next = {
      ...current,
      conversations: [conversation, ...current.conversations],
    };
    progressRef.current = next;
    setProgress(next);
    return conversation;
  }, []);

  const startNewConversation = useCallback((scenario: Scenario): Conversation | null => {
    const current = progressRef.current;
    if (!current) return null;
    const now = new Date();
    const conversation = makeNewConversation(scenario, now);
    const next = {
      ...current,
      conversations: [conversation, ...current.conversations],
    };
    progressRef.current = next;
    setProgress(next);
    return conversation;
  }, []);

  const appendUserMessage = useCallback(
    (conversationId: string, content: string): ChatMessage | null => {
      const current = progressRef.current;
      if (!current) return null;
      const conversation = current.conversations.find(
        (item) => item.id === conversationId,
      );
      if (!conversation) return null;

      const now = new Date();
      const message = createChatMessage("user", content.trim(), now);
      setProgress((state) => {
        if (!state) return state;
        const existing = state.conversations.find(
          (item) => item.id === conversationId,
        );
        if (!existing) return state;
        const next: ProgressState = {
          ...state,
          conversations: state.conversations.map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  messages: [...item.messages, message],
                  updatedAt: now.toISOString(),
                }
              : item,
          ),
        };
        progressRef.current = next;
        return next;
      });
      return message;
    },
    [],
  );

  const completeTutorTurn = useCallback((input: CompleteTutorTurnInput) => {
    setProgress((current) => {
      if (!current) return current;
      const conversation = current.conversations.find(
        (item) => item.id === input.conversationId,
      );
      if (!conversation) return current;

      const now = new Date();
      const assistantMessage: ChatMessage = {
        ...createChatMessage("assistant", input.replyDe.trim(), now),
        ...(input.translationAr ? { translationAr: input.translationAr } : {}),
        ...(input.vocabulary && input.vocabulary.length > 0
          ? { vocabulary: input.vocabulary }
          : {}),
        mode: input.mode,
      };

      let next: ProgressState = {
        ...current,
        conversations: current.conversations.map((item) =>
          item.id === input.conversationId
            ? {
                ...item,
                messages: [
                  ...item.messages.map((message) =>
                    message.id === input.userMessageId
                      ? mergeCorrectionIntoMessage(message, input.correction)
                      : message,
                  ),
                  assistantMessage,
                ],
                updatedAt: now.toISOString(),
              }
            : item,
        ),
      };

      const uniqueMistakeTypes = new Set(
        input.correction.mistakes.map((mistake) => mistake.type),
      );
      const additions: AddWeakSpotInput[] = [];
      for (const type of uniqueMistakeTypes) {
        const meta = CHAT_MISTAKE_META[type];
        if (!meta) continue;
        additions.push({
          topic: meta.topic,
          pattern: `chat:${type}`,
          labelAr: meta.labelAr,
          labelEn: meta.labelEn,
        });
      }
      next = addWeakSpotsBatch(next, additions, now);
      next = addPracticeActivity(next, { xp: 10, seconds: 0 }, now);
      progressRef.current = next;
      return next;
    });
  }, []);

  const retrySync = useCallback(async () => {
    if (authMode !== "authenticated" || !user) return;
    const snapshot = progressRef.current;
    if (!snapshot) return;
    userIdRef.current = user.id;
    syncAllowedRef.current = true;
    pendingSyncRef.current = snapshot;
    await flushRemoteSync();
  }, [authMode, user, flushRemoteSync]);

  const resetProgress = useCallback(async () => {
    const current = progressRef.current;
    if (!current) return;
    const ownerId = current.ownerId === GUEST_OWNER_ID ? GUEST_OWNER_ID : current.ownerId;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    pendingSyncRef.current = null;

    if (authMode === "authenticated" && user) {
      setSyncStatus("syncing");
      try {
        await deleteRemoteProgress(user.id);
      } catch (error) {
        console.warn("[sync] Could not clear remote progress:", error);
        setSyncStatus("error");
      }
    }

    const fresh = createDefaultProgress(ownerId);
    clearLocalProgress();
    setProgressState(fresh);
    setSyncStatus(authMode === "authenticated" ? "syncing" : "local");
    if (authMode === "authenticated" && user) {
      syncAllowedRef.current = true;
      userIdRef.current = user.id;
      pendingSyncRef.current = fresh;
      void flushRemoteSync();
    }
  }, [authMode, user, setProgressState, flushRemoteSync]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      loading,
      syncStatus,
      updateProfile,
      completeOnboarding,
      recordDrillAnswer,
      addVocabCard,
      reviewVocabCard,
      ensureConversation,
      startNewConversation,
      appendUserMessage,
      completeTutorTurn,
      resetProgress,
      retrySync,
    }),
    [
      progress,
      loading,
      syncStatus,
      updateProfile,
      completeOnboarding,
      recordDrillAnswer,
      addVocabCard,
      reviewVocabCard,
      ensureConversation,
      startNewConversation,
      appendUserMessage,
      completeTutorTurn,
      resetProgress,
      retrySync,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside ProgressProvider");
  return value;
}

export function useActiveProfile(): Profile | null {
  return useProgress().progress?.profile ?? null;
}

export function useDueVocabulary(): VocabCard[] {
  const { progress } = useProgress();
  if (!progress) return [];
  return progress.vocabCards.filter(
    (card) => new Date(card.dueDate).getTime() <= Date.now(),
  );
}

export function useTodayActivity() {
  const { progress } = useProgress();
  const key = dateKey();
  return progress?.activity.find((day) => day.date === key) ?? null;
}

export { CHAT_MISTAKE_META };
