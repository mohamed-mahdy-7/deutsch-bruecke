import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Layers,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import type {
  GrammarArticle,
  VocabularyCategory,
} from "@/types/domain";
import type { TranslationKey } from "@/lib/i18n";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { dueCards } from "@/lib/srs";
import { CATEGORY_LABEL_KEY } from "@/lib/uiLabels";
import { relativeDueLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, buttonCn } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field, inputCn, selectCn } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Feedback";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";

type CategoryFilter = "all" | VocabularyCategory;

const CATEGORY_ORDER: VocabularyCategory[] = [
  "home",
  "people",
  "food",
  "city",
  "work",
  "health",
  "shopping",
  "other",
];

const ARTICLE_GENDER_KEY = {
  der: "gender.masculine",
  die: "gender.feminine",
  das: "gender.neuter",
} as const satisfies Record<GrammarArticle, TranslationKey>;

const ARTICLE_TONE: Record<GrammarArticle, BadgeTone> = {
  der: "masc",
  die: "fem",
  das: "neut",
};

const ARTICLE_COLOR: Record<GrammarArticle, string> = {
  der: "text-masc",
  die: "text-fem",
  das: "text-neut",
};

function matchesSearch(
  card: { word: string; translationAr: string; translationEn: string; plural: string | null },
  query: string,
): boolean {
  const haystack = [
    card.word,
    card.translationAr,
    card.translationEn,
    card.plural ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function VocabularyPage() {
  const { t, language } = useAppPreferences();
  const { progress, addVocabCard } = useProgress();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Add-word form state.
  const [word, setWord] = useState("");
  const [article, setArticle] = useState<GrammarArticle | "none">("der");
  const [plural, setPlural] = useState("");
  const [translationAr, setTranslationAr] = useState("");
  const [translationEn, setTranslationEn] = useState("");
  const [exampleDe, setExampleDe] = useState("");
  const [exampleAr, setExampleAr] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4_000);
    return () => clearTimeout(timer);
  }, [notice]);

  const due = useMemo(
    () => dueCards(progress?.vocabCards ?? []),
    [progress?.vocabCards],
  );

  const filtered = useMemo(() => {
    const query = search.trim();
    const cards = progress?.vocabCards ?? [];
    return [...cards]
      .filter((card) => category === "all" || card.category === category)
      .filter((card) => (query ? matchesSearch(card, query) : true))
      .sort((a, b) => {
        if (a.dueDate !== b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.word.localeCompare(b.word, "de");
      });
  }, [progress?.vocabCards, category, search]);

  const total = progress?.vocabCards.length ?? 0;
  const reviewCount = Math.min(due.length, 12);

  const openAdd = () => {
    setWord("");
    setArticle("der");
    setPlural("");
    setTranslationAr("");
    setTranslationEn("");
    setExampleDe("");
    setExampleAr("");
    setFormError(null);
    setAddOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!word.trim() || !translationAr.trim()) {
      setFormError(t("vocab.wordRequired"));
      return;
    }
    const added = addVocabCard({
      word: word.trim(),
      article: article === "none" ? null : article,
      plural: plural.trim() || null,
      translationAr: translationAr.trim(),
      translationEn: translationEn.trim() || undefined,
      exampleDe: exampleDe.trim(),
      exampleAr: exampleAr.trim(),
      source: "manual",
    });
    if (!added) {
      setFormError(t("vocab.duplicate"));
      return;
    }
    setAddOpen(false);
    setNotice(t("vocab.added"));
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.vocabulary")}
        title={t("vocab.title")}
        subtitle={t("vocab.subtitle")}
        actions={
          <Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
            {t("vocab.add")}
          </Button>
        }
      />

      {notice ? (
        <Alert tone="success" className="mt-4">
          {notice}
        </Alert>
      ) : null}

      <section className="surface-card mt-4 overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-primary-soft/80 via-card to-accent-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
              {due.length > 0 ? (
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Sparkles className="h-5 w-5 text-success" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold sm:text-xl">
                {due.length > 0
                  ? t("vocab.dueCount", { count: due.length })
                  : t("vocab.allCaughtUp")}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {due.length > 0 ? t("vocab.easyNote") : t("vocab.caughtBody")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="primary">
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  {t("vocab.total", { count: total })}
                </Badge>
                {due.length > 0 ? (
                  <Badge tone="warning">
                    {t("vocab.reviewDue", { count: reviewCount })}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {due.length > 0 ? (
            <Link
              to="/vocabulary/review"
              className={buttonCn("primary", "md", "shrink-0")}
            >
              {t("vocab.review")}
              <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
            </Link>
          ) : (
            <a
              href="#vocab-library"
              className={buttonCn("outline", "md", "shrink-0")}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {t("vocab.browse")}
            </a>
          )}
        </div>
      </section>

      <section id="vocab-library" className="mt-6 scroll-mt-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">{t("vocab.allWords")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("vocab.showingCount", { count: filtered.length })}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="relative block sm:w-72">
              <span className="sr-only">{t("vocab.search")}</span>
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                dir="auto"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("vocab.search")}
                className={cn(inputCn, "ps-9")}
              />
            </label>
            <label className="block sm:w-48">
              <span className="sr-only">{t("vocab.category.all")}</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as CategoryFilter)
                }
                className={selectCn}
              >
                <option value="all">{t("vocab.category.all")}</option>
                {CATEGORY_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {t(CATEGORY_LABEL_KEY[item])}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4">
          {filtered.length === 0 ? (
            total === 0 ? (
              <EmptyState
                icon={Layers}
                title={t("vocab.noCards")}
                body={t("vocab.addBody")}
                action={
                  <Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
                    {t("vocab.add")}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Search}
                title={t("vocab.emptySearch")}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setCategory("all");
                    }}
                  >
                    {t("common.all")}
                  </Button>
                }
              />
            )
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((card) => (
                <li key={card.id}>
                  <article className="surface-card flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {card.article ? (
                            <Badge tone={ARTICLE_TONE[card.article]}>
                              {t(ARTICLE_GENDER_KEY[card.article])}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">
                              {t("vocab.noArticleShort")}
                            </Badge>
                          )}
                          <Badge tone="neutral">{card.level}</Badge>
                          {card.source === "chat" ? (
                            <Badge tone="primary">{t("vocab.fromTutor")}</Badge>
                          ) : card.source === "manual" ? (
                            <Badge tone="accent">
                              {t("vocab.manualSource")}
                            </Badge>
                          ) : null}
                        </div>

                        <p
                          dir="ltr"
                          lang="de"
                          className="german-inline mt-2 text-xl font-extrabold leading-tight"
                        >
                          {card.article ? (
                            <span className={ARTICLE_COLOR[card.article]}>
                              {card.article}{" "}
                            </span>
                          ) : null}
                          {card.word}
                        </p>
                        <p className="mt-1 text-sm font-bold">
                          {card.translationAr}
                        </p>
                        <p
                          dir="ltr"
                          className="mt-0.5 text-xs text-muted-foreground"
                        >
                          {card.translationEn}
                        </p>
                      </div>
                      <SpeakerButton
                        text={
                          card.article
                            ? `${card.article} ${card.word}`
                            : card.word
                        }
                      />
                    </div>

                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {t("vocab.plural")}
                        </span>
                        <span
                          dir="ltr"
                          lang="de"
                          className="german-inline font-bold"
                        >
                          {card.plural ?? t("vocab.noPlural")}
                        </span>
                      </div>

                      {card.exampleDe ? (
                        <div>
                          <GermanText
                            text={card.exampleDe}
                            interactive={false}
                            className="text-xs font-semibold"
                          />
                          {card.exampleAr ? (
                            <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                              {card.exampleAr}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                        <span className="text-[0.65rem] text-muted-foreground">
                          {t(CATEGORY_LABEL_KEY[card.category])}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-bold text-muted-foreground">
                          {relativeDueLabel(
                            card.dueDate,
                            language,
                            t("vocab.dueNow"),
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("vocab.addTitle")}
        description={t("vocab.addBody")}
        closeLabel={t("common.close")}
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="add-vocab-form">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("vocab.save")}
            </Button>
          </div>
        }
      >
        <form id="add-vocab-form" onSubmit={submit} className="space-y-4">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}

          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Field label={t("vocab.word")} htmlFor="vocab-word">
              <input
                id="vocab-word"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                placeholder={t("vocab.wordPlaceholder")}
                dir="ltr"
                lang="de"
                autoComplete="off"
                className={cn(inputCn, "ltr-field")}
              />
            </Field>

            <Field label={t("vocab.article")} htmlFor="vocab-article">
              <select
                id="vocab-article"
                value={article}
                onChange={(event) =>
                  setArticle(event.target.value as GrammarArticle | "none")
                }
                className={selectCn}
              >
                <option value="der">der</option>
                <option value="die">die</option>
                <option value="das">das</option>
                <option value="none">{t("vocab.noArticle")}</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("vocab.translationAr")} htmlFor="vocab-translation-ar">
              <input
                id="vocab-translation-ar"
                value={translationAr}
                onChange={(event) => setTranslationAr(event.target.value)}
                dir="auto"
                className={inputCn}
              />
            </Field>
            <Field
              label={
                <>
                  {t("vocab.translationEn")}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({t("common.optional")})
                  </span>
                </>
              }
              htmlFor="vocab-translation-en"
            >
              <input
                id="vocab-translation-en"
                value={translationEn}
                onChange={(event) => setTranslationEn(event.target.value)}
                dir="ltr"
                className={cn(inputCn, "ltr-field")}
              />
            </Field>
          </div>

          <Field label={t("vocab.plural")} htmlFor="vocab-plural">
            <input
              id="vocab-plural"
              value={plural}
              onChange={(event) => setPlural(event.target.value)}
              placeholder={t("vocab.pluralPlaceholder")}
              dir="ltr"
              lang="de"
              className={cn(inputCn, "ltr-field")}
            />
          </Field>

          <Field
            label={
              <>
                {t("vocab.example")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </>
            }
            htmlFor="vocab-example-de"
          >
            <input
              id="vocab-example-de"
              value={exampleDe}
              onChange={(event) => setExampleDe(event.target.value)}
              placeholder={t("vocab.examplePlaceholder")}
              dir="ltr"
              lang="de"
              className={cn(inputCn, "ltr-field")}
            />
          </Field>

          <Field
            label={
              <>
                {t("vocab.translationAr")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </>
            }
            htmlFor="vocab-example-ar"
          >
            <input
              id="vocab-example-ar"
              value={exampleAr}
              onChange={(event) => setExampleAr(event.target.value)}
              dir="auto"
              className={inputCn}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
