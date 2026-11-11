import type { TranslationKey } from "@/lib/i18n";
import type {
  CefrLevel,
  DrillTopic,
  GrammarTopic,
  MistakeType,
  NativeDialect,
  SentenceExercise,
  VocabularyCategory,
} from "@/types/domain";

/* Stable translation-key maps keep dynamic labels type-safe. */
export const LEVEL_LABEL_KEY: Record<CefrLevel, TranslationKey> = {
  A1: "level.A1",
  A2: "level.A2",
  B1: "level.B1",
};

export const LEVEL_DESC_KEY: Record<CefrLevel, TranslationKey> = {
  A1: "levelDesc.A1",
  A2: "levelDesc.A2",
  B1: "levelDesc.B1",
};

export const DIALECT_LABEL_KEY: Record<NativeDialect, TranslationKey> = {
  egyptian: "dialect.egyptian",
  levantine: "dialect.levantine",
  gulf: "dialect.gulf",
  maghrebi: "dialect.maghrebi",
  msa: "dialect.msa",
  other: "dialect.other",
};

export const MISTAKE_TYPE_KEY: Record<MistakeType, TranslationKey> = {
  article: "tutor.mistakeType.article",
  case: "tutor.mistakeType.case",
  verb_position: "tutor.mistakeType.verb_position",
  verb_conjugation: "tutor.mistakeType.verb_conjugation",
  preposition: "tutor.mistakeType.preposition",
  vocabulary: "tutor.mistakeType.vocabulary",
  spelling: "tutor.mistakeType.spelling",
  punctuation: "tutor.mistakeType.punctuation",
  word_order: "tutor.mistakeType.word_order",
  register: "tutor.mistakeType.register",
  other: "tutor.mistakeType.other",
};

export const TOPIC_LABEL_KEY: Record<GrammarTopic, TranslationKey> = {
  articles: "topic.articles",
  cases: "topic.cases",
  word_order: "topic.word_order",
  vocabulary: "topic.vocabulary",
  prepositions: "topic.prepositions",
};

export const DRILL_TOPIC_LABEL_KEY: Record<DrillTopic, TranslationKey> = {
  articles: "drillTopic.articles",
  cases: "drillTopic.cases",
  prepositions: "drillTopic.prepositions",
  verb_position: "drillTopic.verb_position",
  separable_verbs: "drillTopic.separable_verbs",
  subordinate_clauses: "drillTopic.subordinate_clauses",
  plurals: "drillTopic.plurals",
};

export const DRILL_TOPIC_DESC_KEY: Record<DrillTopic, TranslationKey> = {
  articles: "drillTopic.articlesDesc",
  cases: "drillTopic.casesDesc",
  prepositions: "drillTopic.prepositionsDesc",
  verb_position: "drillTopic.verb_positionDesc",
  separable_verbs: "drillTopic.separable_verbsDesc",
  subordinate_clauses: "drillTopic.subordinate_clausesDesc",
  plurals: "drillTopic.pluralsDesc",
};

export const CATEGORY_LABEL_KEY: Record<VocabularyCategory, TranslationKey> = {
  home: "vocab.category.home",
  people: "vocab.category.people",
  food: "vocab.category.food",
  city: "vocab.category.city",
  work: "vocab.category.work",
  health: "vocab.category.health",
  shopping: "vocab.category.shopping",
  other: "vocab.category.other",
};

const SENTENCE_KIND_LABELS: Record<
  SentenceExercise["kind"],
  { ar: string; en: string }
> = {
  "verb-second": { ar: "الفعل التاني", en: "Second-position verb" },
  "verb-final": { ar: "الفعل في الآخر", en: "Final verb" },
  separable: { ar: "فعل منفصل", en: "Separable verb" },
  question: { ar: "سؤال", en: "Question" },
  general: { ar: "ترتيب عام", en: "General order" },
};

export function sentenceKindLabel(
  kind: SentenceExercise["kind"],
  language: "ar" | "en",
): string {
  return SENTENCE_KIND_LABELS[kind][language];
}

/** Deep-link every weak spot to the exercise that trains it. */
export function weakSpotHref(topic: GrammarTopic): string {
  switch (topic) {
    case "vocabulary":
      return "/vocabulary/review";
    case "prepositions":
      return "/grammar?topic=prepositions";
    case "word_order":
      return "/builder";
    case "cases":
      return "/grammar?topic=cases";
    case "articles":
      return "/grammar?topic=articles";
    default:
      return "/grammar";
  }
}
