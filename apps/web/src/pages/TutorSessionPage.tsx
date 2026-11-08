import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Clock3,
  MessageCircle,
  Mic,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { AiAction } from "@/types/domain";
import { getScenario } from "@/data/scenarios";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSpeechRecognition } from "@/hooks/useSpeech";
import {
  AiRequestError,
  fetchAiHealth,
  requestTutorTurn,
  type AiMode,
} from "@/services/ai";
import { LEVEL_LABEL_KEY } from "@/lib/uiLabels";
import { SCENARIO_THEME } from "@/lib/scenarioTheme";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonCn } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { ChatBubble } from "@/components/tutor/ChatBubble";
import { AiPanel } from "@/components/tutor/AiPanel";
import { WordSheet } from "@/components/tutor/WordSheet";

export function TutorSessionPage() {
  const { scenarioId } = useParams();
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  const { t, language } = useAppPreferences();
  const {
    progress,
    ensureConversation,
    startNewConversation,
    appendUserMessage,
    completeTutorTurn,
  } = useProgress();
  const online = useOnlineStatus();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ messageId: string; text: string } | null>(
    null,
  );
  const [wordTarget, setWordTarget] = useState<{
    word: string;
    context: string;
  } | null>(null);
  const [panelTarget, setPanelTarget] = useState<{
    action: AiAction;
    text: string;
  } | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversation =
    progress?.conversations.find(
      (item) => item.id === conversationId && item.scenarioId === scenario?.id,
    ) ?? null;
  const messages = conversation?.messages ?? [];

  const speech = useSpeechRecognition({
    language: "de-DE",
    onTranscript: (transcript) => {
      if (transcript) setInput(transcript);
    },
    onError: () => setSpeechError(t("tutor.speechError")),
  });

  // Resume the latest conversation for this scene, or create the first one.
  useEffect(() => {
    if (!scenario) return;
    setConversationId(null);
    setInput("");
    setError(null);
    setFailed(null);
    setSpeechError(null);
    const existing = ensureConversation(scenario);
    if (existing) setConversationId(existing.id);
  }, [scenario?.id, ensureConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    void fetchAiHealth().then((result) => {
      if (alive) setAiMode(result.mode);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, sending]);

  useEffect(() => {
    return () => {
      speech.stop();
    };
    // Stop recognition only when the scene unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!scenario) {
    return (
      <EmptyState
        icon={MessageCircle}
        title={t("notfound.title")}
        body={t("notfound.body")}
        action={
          <Link to="/tutor" className={buttonCn("primary", "md")}>
            {t("tutor.backScenarios")}
          </Link>
        }
      />
    );
  }

  const theme = SCENARIO_THEME[scenario.color];
  const title = language === "ar" ? scenario.titleAr : scenario.titleEn;
  const description =
    language === "ar" ? scenario.descriptionAr : scenario.descriptionEn;

  const sendTurn = async (text: string, existingMessageId?: string) => {
    if (!conversation || sending) return;
    setError(null);
    setSpeechError(null);
    speech.stop();
    setSending(true);

    let messageId = existingMessageId;
    if (!messageId) {
      const message = appendUserMessage(conversation.id, text);
      if (!message) {
        setSending(false);
        setError("not_found");
        return;
      }
      messageId = message.id;
    }

    const history = conversation.messages
      .filter((message) => message.id !== messageId)
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const { data, mode } = await requestTutorTurn({
        scenarioId: scenario.id,
        level: progress?.profile.level ?? "A1",
        dialect: progress?.profile.nativeDialect ?? "egyptian",
        safeMode,
        learnerMessage: text,
        history,
      });

      if (mode === "live" || mode === "demo" || mode === "unavailable") {
        setAiMode(mode);
      }
      completeTutorTurn({
        conversationId: conversation.id,
        userMessageId: messageId,
        correction: data.correction,
        replyDe: data.reply_de,
        translationAr: data.translation_ar,
        vocabulary: data.vocabulary,
        mode: mode === "demo" ? "demo" : "live",
      });
      setFailed(null);
      setInput("");
    } catch (caught) {
      const code = caught instanceof AiRequestError ? caught.code : "unknown";
      setError(code);
      setFailed({ messageId, text });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const submit = () => {
    const text = input.trim();
    if (!text || !conversation || sending || !online) return;
    setFailed(null);
    setInput("");
    void sendTurn(text);
  };

  const retry = () => {
    if (!failed) return;
    void sendTurn(failed.text, failed.messageId);
  };

  const beginNewConversation = () => {
    const conversationNext = startNewConversation(scenario);
    if (conversationNext) setConversationId(conversationNext.id);
    setInput("");
    setError(null);
    setFailed(null);
    setNewChatOpen(false);
    inputRef.current?.focus();
  };

  const toggleSpeech = () => {
    setSpeechError(null);
    if (speech.listening) {
      speech.stop();
      return;
    }
    speech.start();
  };

  const errorText =
    error === "rate_limited"
      ? t("tutor.rateLimit")
      : error === "network" || error === "timeout"
        ? t("tutor.errorBody")
        : t("ai.unavailable");

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/tutor"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 flip-rtl" aria-hidden="true" />
          {t("tutor.backScenarios")}
        </Link>
        <div className="flex items-center gap-1.5">
          {aiMode === "live" ? (
            <Badge tone="success">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {t("tutor.modeLive")}
            </Badge>
          ) : aiMode === "demo" ? (
            <Badge tone="accent">{t("tutor.modeDemo")}</Badge>
          ) : null}
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("tutor.newChat")}
          </button>
        </div>
      </div>

      <section
        className={`mt-3 rounded-3xl border border-border/70 bg-gradient-to-br ${theme.panel} p-4 shadow-soft sm:p-5`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${theme.icon}`}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">
                  {t("tutor.level", {
                    level: t(LEVEL_LABEL_KEY[scenario.level]),
                  })}
                </Badge>
                <Badge tone="neutral">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {t("tutor.minutes", { count: scenario.durationMinutes })}
                </Badge>
                <Badge tone="neutral">
                  {language === "ar" ? scenario.aiRoleAr : scenario.aiRoleEn}
                </Badge>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSafeMode((current) => !current)}
            aria-pressed={safeMode}
            title={t("tutor.safeModeHint")}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors",
              safeMode
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {safeMode ? t("tutor.safeModeOn") : t("tutor.safeMode")}
          </button>
        </div>
      </section>

      {aiMode === "demo" ? (
        <Alert tone="warning" className="mt-3 py-2 text-xs">
          {t("tutor.demoBanner")}
        </Alert>
      ) : null}
      {!online ? (
        <Alert tone="warning" className="mt-3">
          {t("tutor.offline")}
        </Alert>
      ) : null}

      <div className="surface-card mt-3 flex h-[68dvh] min-h-[28rem] flex-col overflow-hidden p-0">
        <div
          ref={scrollRef}
          className="chat-scroll flex-1 space-y-4 overflow-y-auto p-3.5 sm:p-5"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              onWordClick={(word, context) => setWordTarget({ word, context })}
              onPanel={(action, text) => setPanelTarget({ action, text })}
            />
          ))}

          {messages.length <= 1 ? (
            <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-border bg-muted/25 px-4 py-3 text-center">
              <p className="text-sm font-bold">{t("tutor.emptyHint")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("tutor.tapWordHint")}
              </p>
            </div>
          ) : null}

          {sending ? (
            <div className="flex items-start gap-2.5" role="status">
              <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-ss-md border border-border/70 bg-card px-3.5 py-3 shadow-sm">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-muted-foreground/60" />
                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: "160ms" }}
                />
                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-muted-foreground/60"
                  style={{ animationDelay: "320ms" }}
                />
                <span className="ms-1 text-xs text-muted-foreground">
                  {t("tutor.typing")}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="border-t border-danger/20 bg-danger/5 p-3">
            <Alert
              tone="danger"
              title={t("tutor.errorTitle")}
              action={
                failed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retry}
                    disabled={sending}
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    {t("tutor.retrySend")}
                  </Button>
                ) : undefined
              }
            >
              {errorText}
            </Alert>
          </div>
        ) : null}

        <div className="border-t border-border/60 bg-card p-3 sm:p-4">
          {speech.listening ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-primary-soft/60 px-3 py-1.5 text-xs font-bold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t("tutor.listening")}
            </div>
          ) : null}
          {speechError ? (
            <p role="alert" className="mb-2 text-xs font-semibold text-danger">
              {speechError}
            </p>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={toggleSpeech}
                disabled={!speech.supported}
                aria-pressed={speech.listening}
                aria-label={
                  speech.listening
                    ? t("aria.stopRecording")
                    : t("aria.startRecording")
                }
                title={
                  speech.supported
                    ? t("tutor.listening")
                    : t("tutor.speechUnsupported")
                }
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  speech.listening
                    ? "border-primary/50 bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1">
                <label htmlFor="tutor-message" className="sr-only">
                  {t("tutor.placeholder")}
                </label>
                <textarea
                  id="tutor-message"
                  ref={inputRef}
                  dir="ltr"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  rows={2}
                  maxLength={500}
                  placeholder={t("tutor.placeholder")}
                  disabled={!online}
                  className="ltr-field max-h-32 min-h-[2.75rem] w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
                />
              </div>

              <Button
                type="submit"
                size="icon"
                loading={sending}
                disabled={!input.trim() || !online || !conversation}
                aria-label={t("tutor.send")}
                icon={<Send className="h-4 w-4 flip-rtl" aria-hidden="true" />}
              >
                <span className="sr-only">{t("tutor.send")}</span>
              </Button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 px-0.5 text-[0.62rem] text-muted-foreground">
              <span>{t("tutor.sendHint")}</span>
              <span>{t("tutor.gentleNote")}</span>
            </div>
          </form>
        </div>
      </div>

      <WordSheet target={wordTarget} onClose={() => setWordTarget(null)} />
      <AiPanel target={panelTarget} onClose={() => setPanelTarget(null)} />

      <Modal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        title={t("tutor.newChat")}
        description={t("tutor.allDone")}
        closeLabel={t("common.close")}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewChatOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={beginNewConversation} icon={<Plus className="h-4 w-4" />}>
              {t("tutor.newChat")}
            </Button>
          </div>
        }
      >
        <div className="rounded-2xl bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
          {t("tutor.sessionStart")} — {title}
        </div>
      </Modal>
    </div>
  );
}
