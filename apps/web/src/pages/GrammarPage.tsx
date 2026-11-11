import { Link, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  ArrowRight,
  BookOpen,
  Compass,
  GitBranch,
  Layers,
  MapPin,
  Scale,
  Scissors,
  Sparkles,
  Target,
} from "lucide-react";
import type { DrillTopic, WeakSpot } from "@/types/domain";
import { useAppPreferences } from "@/state/useAppPreferences";
import { useProgress } from "@/state/ProgressProvider";
import { sortWeakSpots } from "@/lib/adaptive";
import {
  DRILL_TOPIC_DESC_KEY,
  DRILL_TOPIC_LABEL_KEY,
} from "@/lib/uiLabels";
import { cn } from "@/lib/utils";
import { weakSpotsForTopic } from "@/services/drillMapping";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GermanText } from "@/components/german/GermanText";
import { SpeakerButton } from "@/components/german/SpeakerButton";
import { GrammarLegend } from "@/components/german/GrammarLegend";
import { DrillSession } from "@/components/grammar/DrillSession";

type GrammarTab = "practice" | "guide";

const TAB_ITEMS = [
  { id: "practice", label: "grammar.tab.practice", icon: Sparkles },
  { id: "guide", label: "grammar.tab.guide", icon: Compass },
] as const;

interface TopicCard {
  id: DrillTopic;
  icon: LucideIcon;
  tone: string;
}

const TOPIC_CARDS: TopicCard[] = [
  { id: "articles", icon: BookOpen, tone: "bg-masc/10 text-masc" },
  { id: "cases", icon: Scale, tone: "bg-primary-soft text-primary" },
  {
    id: "prepositions",
    icon: MapPin,
    tone: "bg-accent-soft text-accent-soft-foreground",
  },
  { id: "verb_position", icon: AlignLeft, tone: "bg-verb/10 text-verb" },
  { id: "separable_verbs", icon: Scissors, tone: "bg-warning/15 text-warning" },
  {
    id: "subordinate_clauses",
    icon: GitBranch,
    tone: "bg-fem/10 text-fem",
  },
  { id: "plurals", icon: Layers, tone: "bg-neut/10 text-neut" },
];

const DRILL_TOPIC_IDS = new Set<string>(TOPIC_CARDS.map((card) => card.id));

function isDrillTopic(value: string | null): value is DrillTopic {
  return value !== null && DRILL_TOPIC_IDS.has(value);
}

function DrillHub({
  level,
  weakSpots,
}: {
  level: string;
  weakSpots: WeakSpot[];
}) {
  const { t, language } = useAppPreferences();
  const topWeakSpots = weakSpots.slice(0, 5);

  return (
    <div className="space-y-5">
      <section className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-primary-soft/70 to-accent-soft/50 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t("grammar.hubTitle")}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t("grammar.hubSubtitle")}
              </p>
            </div>
            <Badge tone="primary">{t("grammar.topicLevel", { level })}</Badge>
          </div>
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            {t("grammar.hubHint")}
          </p>
          <div className="mt-4">
            <GrammarLegend />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TOPIC_CARDS.map((card) => {
          const Icon = card.icon;
          const relevantSpots = weakSpotsForTopic(card.id, weakSpots).slice(
            0,
            2,
          );

          return (
            <Link
              key={card.id}
              to={`/grammar?topic=${card.id}`}
              className="surface-card group flex h-full flex-col p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                    card.tone,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <Badge tone="neutral">{t("grammar.questionCount", { count: 10 })}</Badge>
              </div>

              <h3 className="mt-3 text-base font-extrabold">
                {t(DRILL_TOPIC_LABEL_KEY[card.id])}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(DRILL_TOPIC_DESC_KEY[card.id])}
              </p>

              {relevantSpots.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {relevantSpots.map((spot) => (
                    <Badge key={spot.id} tone="warning">
                      <Target className="h-3 w-3" aria-hidden="true" />
                      {language === "ar" ? spot.labelAr : spot.labelEn}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-extrabold text-primary">
                {t("grammar.startTopic")}
                <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <section className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold">
              <Target className="h-4 w-4 text-warning" aria-hidden="true" />
              {t("grammar.weakSpotsTitle")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("grammar.weakSpotsBody")}
            </p>
          </div>
          <Badge tone="neutral">{t("grammar.adapting")}</Badge>
        </div>

        {topWeakSpots.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
            {t("grammar.focusNone")}
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {topWeakSpots.map((spot) => (
              <li key={spot.id}>
                <Badge tone="warning">
                  {language === "ar" ? spot.labelAr : spot.labelEn}
                  <span className="tnum opacity-70">{spot.count}</span>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ARTICLE_TABLE = [
  {
    caseKey: "case.nominative",
    forms: ["der", "die", "das", "die"],
  },
  {
    caseKey: "case.accusative",
    forms: ["den", "die", "das", "die"],
  },
  {
    caseKey: "case.dative",
    forms: ["dem", "der", "dem", "den"],
  },
  {
    caseKey: "case.genitive",
    forms: ["des", "der", "des", "der"],
  },
] as const;

function GrammarGuide() {
  const { t, language } = useAppPreferences();

  return (
    <div className="space-y-4">
      <section className="surface-card overflow-hidden">
        <div className="bg-gradient-to-br from-primary-soft/70 to-accent-soft/50 p-5 sm:p-6">
          <p className="eyebrow">{t("grammar.guideTitle")}</p>
          <h2 className="mt-1.5 text-xl font-extrabold sm:text-2xl">
            {t("grammar.articleMemory")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("grammar.guideIntro")}
          </p>
          <div className="mt-3">
            <GrammarLegend />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-extrabold">{t("grammar.woTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("grammar.woQuestion")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{t("grammar.woRule")}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <GermanText
                text={t("grammar.woExampleDe")}
                interactive={false}
                className="text-sm font-semibold"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("grammar.woExampleAr")}
              </p>
            </div>
            <SpeakerButton text={t("grammar.woExampleDe")} />
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-extrabold">{t("grammar.wohinTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("grammar.wohinQuestion")}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{t("grammar.wohinRule")}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <GermanText
                text={t("grammar.wohinExampleDe")}
                interactive={false}
                className="text-sm font-semibold"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("grammar.wohinExampleAr")}
              </p>
            </div>
            <SpeakerButton text={t("grammar.wohinExampleDe")} />
          </div>
        </section>
      </div>

      <section className="surface-card p-5">
        <SectionHeader
          title={t("grammar.prepositionsVisual")}
          subtitle={t("grammar.prepositionTip")}
        />
        <div className="overflow-x-auto">
          <table
            dir="ltr"
            className="w-full min-w-[32rem] border-separate border-spacing-0 text-start"
          >
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="border-b border-border/60 p-2 text-start font-bold">
                  {t("grammar.tab.articles")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold text-masc">
                  {t("gender.masculine")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold text-fem">
                  {t("gender.feminine")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold text-neut">
                  {t("gender.neuter")}
                </th>
                <th className="border-b border-border/60 p-2 font-bold">
                  Plural
                </th>
              </tr>
            </thead>
            <tbody>
              {ARTICLE_TABLE.map((row) => (
                <tr key={row.caseKey}>
                  <th className="border-b border-border/40 p-2 text-start text-xs font-bold">
                    {t(row.caseKey)}
                  </th>
                  {row.forms.map((form, column) => (
                    <td
                      key={`${row.caseKey}-${column}`}
                      className={cn(
                        "german-inline border-b border-border/40 p-2 text-sm font-bold",
                        column === 0 && "grammar-der",
                        column === 1 && "grammar-die",
                        column === 2 && "grammar-das",
                      )}
                    >
                      {form}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card flex items-start gap-3 p-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-extrabold">{t("grammar.articleMemory")}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {language === "ar"
              ? "احفظ الاسم بأداته من أول مرة: der Tisch، die Tür، das Fenster. لما تعرف الحالة، غيّر النهاية بس."
              : "Learn each noun with its article from the start: der Tisch, die Tür, das Fenster. Once you know the case, change only the ending."}
          </p>
        </div>
      </section>
    </div>
  );
}

export function GrammarPage() {
  const { t } = useAppPreferences();
  const { progress } = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTopic = searchParams.get("topic");
  const rawTab = searchParams.get("tab");
  const legacyTopic =
    rawTab === "articles" || rawTab === "prepositions" ? rawTab : null;
  const topic: DrillTopic | null = isDrillTopic(rawTopic)
    ? rawTopic
    : legacyTopic;
  const tab: GrammarTab = rawTab === "guide" ? "guide" : "practice";

  const level = progress?.profile.level ?? "A1";
  const weakSpots = sortWeakSpots(progress?.weakSpots ?? []);

  const setTab = (next: string) => {
    setSearchParams(next === "guide" ? { tab: "guide" } : {}, {
      replace: true,
    });
  };

  const exitTopic = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t("nav.grammar")}
        title={t("grammar.title")}
        subtitle={t("grammar.subtitle")}
      />

      <SegmentedTabs
        items={TAB_ITEMS.map((item) => ({
          id: item.id,
          label: t(item.label),
          icon: item.icon,
        }))}
        value={tab}
        onChange={setTab}
        ariaLabel={t("grammar.selectPractice")}
        className="mt-4"
      />

      <div className="mt-5">
        {tab === "guide" ? <GrammarGuide /> : null}

        {tab === "practice" && topic ? (
          <DrillSession
            key={topic}
            topic={topic}
            level={level}
            weakSpots={weakSpots}
            onExit={exitTopic}
          />
        ) : null}

        {tab === "practice" && !topic ? (
          <DrillHub level={level} weakSpots={weakSpots} />
        ) : null}
      </div>

      {tab === "guide" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setTab("practice")}>
            {t("grammar.backToTopics")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
