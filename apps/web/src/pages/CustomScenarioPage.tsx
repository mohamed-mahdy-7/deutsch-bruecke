import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  CefrLevel,
  CustomScenarioDraft,
  GrammarArticle,
  ScenarioFormality,
  ScenarioTone,
} from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useCustomScenarios } from "@/state/CustomScenariosProvider";
import {
  AiRequestError,
  requestScenarioGeneration,
  type ScenarioGenerationInput,
} from "@/services/ai";
import {
  customScenarioToDraft,
  generatedScenarioToDraft,
} from "@/services/customScenarioMapping";
import { cn } from "@/lib/utils";
import { Field, inputCn, selectCn } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { GermanText } from "@/components/german/GermanText";

type GenerationError =
  | { kind: "refused"; message: string }
  | { kind: "error" }
  | { kind: "invalid"; message: string };

function isFilled(value: string): boolean {
  return value.trim().length > 0;
}

function isDraftComplete(draft: CustomScenarioDraft): boolean {
  if (
    !isFilled(draft.titleDe) ||
    !isFilled(draft.titleAr) ||
    !isFilled(draft.emoji) ||
    !isFilled(draft.settingAr) ||
    !isFilled(draft.aiRoleDe) ||
    !isFilled(draft.learnerRoleAr) ||
    !isFilled(draft.goalAr) ||
    !isFilled(draft.openingDe) ||
    !isFilled(draft.openingAr)
  ) {
    return false;
  }
  if (
    draft.grammarFocus.length < 1 ||
    draft.grammarFocus.length > 4 ||
    draft.grammarFocus.some((item) => !isFilled(item))
  ) {
    return false;
  }
  if (
    draft.keyVocab.length < 2 ||
    draft.keyVocab.length > 8 ||
    draft.keyVocab.some(
      (item) => !isFilled(item.de) || !isFilled(item.ar),
    )
  ) {
    return false;
  }
  if (
    draft.usefulPhrases.length < 1 ||
    draft.usefulPhrases.length > 6 ||
    draft.usefulPhrases.some(
      (item) => !isFilled(item.de) || !isFilled(item.ar),
    )
  ) {
    return false;
  }
  return true;
}

function PreviewSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="h-16 animate-pulse rounded-2xl bg-muted/60"
          style={{ animationDelay: `${row * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function CustomScenarioPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppPreferences();
  const { loading, getScenario, saveScenario } = useCustomScenarios();

  const [idea, setIdea] = useState("");
  const [level, setLevel] = useState<CefrLevel | "auto">("auto");
  const [formality, setFormality] = useState<ScenarioFormality | "auto">("auto");
  const [tone, setTone] = useState<ScenarioTone>("friendly");
  const [draft, setDraft] = useState<CustomScenarioDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<GenerationError | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoadedExisting(false);
    setDraft(null);
    setIdea("");
    setError(null);
    setEdited(false);
    setLevel("auto");
    setFormality("auto");
    setTone("friendly");
  }, [scenarioId]);

  useEffect(() => {
    if (!scenarioId || loading || loadedExisting) return;
    const found = getScenario(scenarioId);
    if (found) {
      setDraft(customScenarioToDraft(found));
      setLevel(found.level);
      setFormality(found.formality);
      setTone(found.tone);
    }
    setLoadedExisting(true);
  }, [scenarioId, loading, loadedExisting, getScenario]);

  const patch = (changes: Partial<CustomScenarioDraft>) => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
    setEdited(true);
  };

  const generate = async (forceRegenerate: boolean) => {
    const trimmed = idea.trim();
    if (trimmed.length < 3 && !draft) {
      setError({ kind: "invalid", message: t("tutor.invalidIdea") });
      ideaRef.current?.focus();
      return;
    }

    const input: ScenarioGenerationInput = {
      idea: trimmed.length >= 3 ? trimmed : (draft?.goalAr ?? ""),
      tone,
      forceRegenerate,
    };
    if (level !== "auto") input.level = level;
    if (formality !== "auto") input.formality = formality;

    setGenerating(true);
    setError(null);
    try {
      const { data } = await requestScenarioGeneration(input);
      setDraft(generatedScenarioToDraft(data));
      setEdited(false);
      setLevel(data.level);
      setFormality(data.formality);
      setTone(data.tone);
    } catch (caught) {
      if (
        caught instanceof AiRequestError &&
        caught.code === "scenario_refused"
      ) {
        setError({
          kind: "refused",
          message: caught.message || t("tutor.generateErrorBody"),
        });
      } else if (
        caught instanceof AiRequestError &&
        caught.code === "rate_limited"
      ) {
        setError({ kind: "invalid", message: t("tutor.rateLimit") });
      } else {
        setError({ kind: "error" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const accept = async () => {
    if (!draft) return;
    if (!isDraftComplete(draft)) {
      setError({ kind: "invalid", message: t("tutor.previewRequired") });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveScenario(draft, scenarioId);
      navigate(`/tutor/${saved.id}`);
    } catch {
      setError({ kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateVocab = (
    index: number,
    changes: Partial<CustomScenarioDraft["keyVocab"][number]>,
  ) => {
    if (!draft) return;
    patch({
      keyVocab: draft.keyVocab.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    });
  };

  const updatePhrase = (
    index: number,
    changes: Partial<CustomScenarioDraft["usefulPhrases"][number]>,
  ) => {
    if (!draft) return;
    patch({
      usefulPhrases: draft.usefulPhrases.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    });
  };

  const missingExisting =
    Boolean(scenarioId) &&
    !loading &&
    loadedExisting &&
    !getScenario(scenarioId ?? "");

  if (missingExisting) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t("notfound.title")}
        body={t("notfound.body")}
        action={
          <Link to="/tutor" className={buttonText()}>
            {t("tutor.backToScenarios")}
          </Link>
        }
      />
    );
  }

  const errorAlert =
    error?.kind === "refused" ? (
      <Alert
        tone="warning"
        title={t("tutor.refusedTitle")}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void generate(false)}
            disabled={generating}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            {t("common.retry")}
          </Button>
        }
      >
        {error.message}
      </Alert>
    ) : error?.kind === "invalid" ? (
      <Alert tone="warning" title={t("tutor.invalidIdea")}>
        {error.message}
      </Alert>
    ) : error?.kind === "error" ? (
      <Alert
        tone="danger"
        title={t("tutor.generateErrorTitle")}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void generate(Boolean(draft))}
            disabled={generating}
            icon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            {t("common.retry")}
          </Button>
        }
      >
        {t("tutor.generateErrorBody")}
      </Alert>
    ) : null;

  return (
    <div className="animate-fade-up">
      <Link
        to="/tutor"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 flip-rtl" aria-hidden="true" />
        {t("tutor.backToScenarios")}
      </Link>

      <PageHeader
        className="mt-3"
        eyebrow={t("tutor.createBadge")}
        title={t(
          scenarioId ? "tutor.editScenarioTitle" : "tutor.createPageTitle",
        )}
        subtitle={t("tutor.createPageSubtitle")}
        actions={
          <Badge tone="primary">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t("tutor.aiMade")}
          </Badge>
        }
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="surface-card space-y-4 p-4 sm:p-5">
          <Field
            label={t("tutor.ideaLabel")}
            hint={t("tutor.ideaHint")}
            htmlFor="scenario-idea"
          >
            <textarea
              id="scenario-idea"
              ref={ideaRef}
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              rows={4}
              maxLength={500}
              dir="auto"
              placeholder={t("tutor.ideaPlaceholder")}
              className={`${inputCn} min-h-[7rem] resize-y leading-relaxed`}
            />
          </Field>
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            {t("tutor.ideaExamples")}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("tutor.levelLabel")} htmlFor="scenario-level">
              <select
                id="scenario-level"
                value={level}
                onChange={(event) =>
                  setLevel(event.target.value as CefrLevel | "auto")
                }
                className={selectCn}
              >
                <option value="auto">{t("tutor.levelAuto")}</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
              </select>
            </Field>

            <Field
              label={t("tutor.formality")}
              htmlFor="scenario-formality"
            >
              <select
                id="scenario-formality"
                value={formality}
                onChange={(event) =>
                  setFormality(
                    event.target.value as ScenarioFormality | "auto",
                  )
                }
                className={selectCn}
              >
                <option value="auto">{t("tutor.formalityAuto")}</option>
                <option value="du">{t("tutor.formalityDu")}</option>
                <option value="Sie">{t("tutor.formalitySie")}</option>
              </select>
            </Field>

            <Field label={t("tutor.tone")} htmlFor="scenario-tone">
              <select
                id="scenario-tone"
                value={tone}
                onChange={(event) =>
                  setTone(event.target.value as ScenarioTone)
                }
                className={selectCn}
              >
                <option value="friendly">{t("tutor.toneFriendly")}</option>
                <option value="strict">{t("tutor.toneStrict")}</option>
              </select>
            </Field>
          </div>

          <Button
            onClick={() => void generate(Boolean(draft))}
            loading={generating}
            disabled={generating || (!draft && idea.trim().length < 3)}
            icon={<Sparkles className="h-4 w-4" />}
            className="w-full"
          >
            {generating
              ? t("tutor.generating")
              : draft
                ? t("tutor.regenerate")
                : t("tutor.generate")}
          </Button>
          {draft ? (
            <p className="text-center text-[0.65rem] leading-relaxed text-muted-foreground">
              {t("tutor.regenerateHint")}
            </p>
          ) : null}

          {errorAlert}
        </section>

        <section className="surface-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="eyebrow">{t("tutor.previewTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("tutor.previewSubtitle")}
              </p>
            </div>
            {edited ? (
              <Badge tone="accent">{t("tutor.editedBadge")}</Badge>
            ) : null}
          </div>

          {!draft ? (
            generating ? (
              <div className="mt-4">
                <PreviewSkeleton label={t("tutor.generating")} />
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title={t("tutor.previewEmptyTitle")}
                body={t("tutor.previewEmptyBody")}
                className="mt-4"
              />
            )
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("tutor.field.titleDe")} htmlFor="field-title-de">
                  <input
                    id="field-title-de"
                    dir="ltr"
                    value={draft.titleDe}
                    maxLength={80}
                    onChange={(event) => patch({ titleDe: event.target.value })}
                    className={`${inputCn} ltr-field`}
                  />
                </Field>
                <Field label={t("tutor.field.titleAr")} htmlFor="field-title-ar">
                  <input
                    id="field-title-ar"
                    dir="auto"
                    value={draft.titleAr}
                    maxLength={80}
                    onChange={(event) => patch({ titleAr: event.target.value })}
                    className={inputCn}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <Field label={t("tutor.field.emoji")} htmlFor="field-emoji">
                  <input
                    id="field-emoji"
                    value={draft.emoji}
                    maxLength={16}
                    onChange={(event) => patch({ emoji: event.target.value })}
                    className={inputCn}
                  />
                </Field>
                <Field label={t("tutor.levelLabel")} htmlFor="field-level">
                  <select
                    id="field-level"
                    value={draft.level}
                    onChange={(event) =>
                      patch({ level: event.target.value as CefrLevel })
                    }
                    className={selectCn}
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                  </select>
                </Field>
                <Field
                  label={t("tutor.formality")}
                  htmlFor="field-formality"
                >
                  <select
                    id="field-formality"
                    value={draft.formality}
                    onChange={(event) =>
                      patch({
                        formality: event.target.value as ScenarioFormality,
                      })
                    }
                    className={selectCn}
                  >
                    <option value="du">du</option>
                    <option value="Sie">Sie</option>
                  </select>
                </Field>
                <Field label={t("tutor.tone")} htmlFor="field-tone">
                  <select
                    id="field-tone"
                    value={draft.tone}
                    onChange={(event) =>
                      patch({ tone: event.target.value as ScenarioTone })
                    }
                    className={selectCn}
                  >
                    <option value="friendly">{t("tutor.toneFriendly")}</option>
                    <option value="strict">{t("tutor.toneStrict")}</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("tutor.field.setting")} htmlFor="field-setting">
                  <textarea
                    id="field-setting"
                    dir="auto"
                    value={draft.settingAr}
                    maxLength={400}
                    rows={2}
                    onChange={(event) =>
                      patch({ settingAr: event.target.value })
                    }
                    className={`${inputCn} resize-y`}
                  />
                </Field>
                <Field label={t("tutor.field.goal")} htmlFor="field-goal">
                  <textarea
                    id="field-goal"
                    dir="auto"
                    value={draft.goalAr}
                    maxLength={400}
                    rows={2}
                    onChange={(event) => patch({ goalAr: event.target.value })}
                    className={`${inputCn} resize-y`}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("tutor.field.aiRole")} htmlFor="field-ai-role">
                  <input
                    id="field-ai-role"
                    dir="ltr"
                    value={draft.aiRoleDe}
                    maxLength={160}
                    onChange={(event) =>
                      patch({ aiRoleDe: event.target.value })
                    }
                    className={`${inputCn} ltr-field`}
                  />
                </Field>
                <Field
                  label={t("tutor.field.learnerRole")}
                  htmlFor="field-learner-role"
                >
                  <input
                    id="field-learner-role"
                    dir="auto"
                    value={draft.learnerRoleAr}
                    maxLength={240}
                    onChange={(event) =>
                      patch({ learnerRoleAr: event.target.value })
                    }
                    className={inputCn}
                  />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t("tutor.field.grammar")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      patch({ grammarFocus: [...draft.grammarFocus, ""] })
                    }
                    disabled={draft.grammarFocus.length >= 4}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("tutor.addGrammar")}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {draft.grammarFocus.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        dir="ltr"
                        value={item}
                        maxLength={80}
                        aria-label={t("tutor.field.grammar")}
                        onChange={(event) =>
                          patch({
                            grammarFocus: draft.grammarFocus.map(
                              (value, itemIndex) =>
                                itemIndex === index
                                  ? event.target.value
                                  : value,
                            ),
                          })
                        }
                        className={`${inputCn} ltr-field`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            grammarFocus: draft.grammarFocus.filter(
                              (_value, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                        disabled={draft.grammarFocus.length <= 1}
                        aria-label={t("common.remove")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t("tutor.field.keyVocab")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        keyVocab: [
                          ...draft.keyVocab,
                          { de: "", article: null, plural: null, ar: "" },
                        ],
                      })
                    }
                    disabled={draft.keyVocab.length >= 8}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("tutor.addVocab")}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {draft.keyVocab.map((item, index) => {
                    const articleColor =
                      item.article === "der"
                        ? "text-masc"
                        : item.article === "die"
                          ? "text-fem"
                          : item.article === "das"
                            ? "text-neut"
                            : "text-muted-foreground";
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-border/70 bg-muted/20 p-2.5"
                      >
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]">
                          <input
                            dir="ltr"
                            value={item.de}
                            maxLength={60}
                            placeholder={t("tutor.field.wordDe")}
                            aria-label={t("tutor.field.wordDe")}
                            onChange={(event) =>
                              updateVocab(index, { de: event.target.value })
                            }
                            className={`${inputCn} ltr-field`}
                          />
                          <select
                            value={item.article ?? ""}
                            aria-label={t("tutor.field.article")}
                            onChange={(event) =>
                              updateVocab(index, {
                                article: event.target.value
                                  ? (event.target.value as GrammarArticle)
                                  : null,
                              })
                            }
                            className={`${selectCn} ${articleColor}`}
                          >
                            <option value="">{t("tutor.noArticle")}</option>
                            <option value="der">der</option>
                            <option value="die">die</option>
                            <option value="das">das</option>
                          </select>
                          <input
                            dir="ltr"
                            value={item.plural ?? ""}
                            maxLength={80}
                            placeholder={t("tutor.field.plural")}
                            aria-label={t("tutor.field.plural")}
                            onChange={(event) =>
                              updateVocab(index, {
                                plural: event.target.value || null,
                              })
                            }
                            className={`${inputCn} ltr-field`}
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            dir="auto"
                            value={item.ar}
                            maxLength={120}
                            placeholder={t("tutor.field.meaningAr")}
                            aria-label={t("tutor.field.meaningAr")}
                            onChange={(event) =>
                              updateVocab(index, { ar: event.target.value })
                            }
                            className={inputCn}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                keyVocab: draft.keyVocab.filter(
                                  (_value, itemIndex) => itemIndex !== index,
                                ),
                              })
                            }
                            disabled={draft.keyVocab.length <= 2}
                            aria-label={t("common.remove")}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                        {item.de ? (
                          <GermanText
                            text={`${item.article ? `${item.article} ` : ""}${item.de}`}
                            interactive={false}
                            className="mt-2 text-xs font-semibold"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-muted-foreground">
                    {t("tutor.field.phrases")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        usefulPhrases: [
                          ...draft.usefulPhrases,
                          { de: "", ar: "" },
                        ],
                      })
                    }
                    disabled={draft.usefulPhrases.length >= 6}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("tutor.addPhrase")}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {draft.usefulPhrases.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                      <input
                        dir="ltr"
                        value={item.de}
                        maxLength={160}
                        placeholder={t("tutor.field.phraseDe")}
                        aria-label={t("tutor.field.phraseDe")}
                        onChange={(event) =>
                          updatePhrase(index, { de: event.target.value })
                        }
                        className={`${inputCn} ltr-field`}
                      />
                      <input
                        dir="auto"
                        value={item.ar}
                        maxLength={160}
                        placeholder={t("tutor.field.phraseAr")}
                        aria-label={t("tutor.field.phraseAr")}
                        onChange={(event) =>
                          updatePhrase(index, { ar: event.target.value })
                        }
                        className={inputCn}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            usefulPhrases: draft.usefulPhrases.filter(
                              (_value, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                        disabled={draft.usefulPhrases.length <= 1}
                        aria-label={t("common.remove")}
                        className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("tutor.field.openingDe")}
                  htmlFor="field-opening-de"
                >
                  <textarea
                    id="field-opening-de"
                    dir="ltr"
                    value={draft.openingDe}
                    maxLength={400}
                    rows={3}
                    onChange={(event) =>
                      patch({ openingDe: event.target.value })
                    }
                    className={`${inputCn} ltr-field resize-y`}
                  />
                </Field>
                <Field
                  label={t("tutor.field.openingAr")}
                  htmlFor="field-opening-ar"
                >
                  <textarea
                    id="field-opening-ar"
                    dir="auto"
                    value={draft.openingAr}
                    maxLength={400}
                    rows={3}
                    onChange={(event) =>
                      patch({ openingAr: event.target.value })
                    }
                    className={`${inputCn} resize-y`}
                  />
                </Field>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/tutor")}
                  disabled={saving}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void accept()}
                  loading={saving}
                  icon={<Check className="h-4 w-4" />}
                >
                  {saving
                    ? t("tutor.savingScenario")
                    : t("tutor.acceptAndStart")}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function buttonText(): string {
  return cn(
    "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
  );
}
