export type CefrLevel = "A1" | "A2" | "B1";
export type UiLanguage = "ar" | "en";
export type NativeDialect =
  | "egyptian"
  | "levantine"
  | "gulf"
  | "maghrebi"
  | "msa"
  | "other";
export type ThemeMode = "light" | "dark" | "system";

export type GrammarTopic =
  | "articles"
  | "cases"
  | "word_order"
  | "vocabulary"
  | "prepositions";

/** Seven practice categories in the AI drill hub. */
export type DrillTopic =
  | "articles"
  | "cases"
  | "prepositions"
  | "verb_position"
  | "separable_verbs"
  | "subordinate_clauses"
  | "plurals";

export type GrammarArticle = "der" | "die" | "das";

export type MistakeType =
  | "article"
  | "case"
  | "verb_position"
  | "verb_conjugation"
  | "preposition"
  | "vocabulary"
  | "spelling"
  | "punctuation"
  | "word_order"
  | "register"
  | "other";

export interface Mistake {
  type: MistakeType;
  original: string;
  fix: string;
  explanation_ar: string;
}

export interface Correction {
  corrected: string;
  isCorrect?: boolean;
  mistakes: Mistake[];
  praise_ar: string;
  follow_up_question_de: string;
}

export interface VocabSuggestion {
  word: string;
  article: GrammarArticle | null;
  plural: string | null;
  translation_ar: string;
  example_de: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  translationAr?: string;
  correction?: Correction;
  vocabulary?: VocabSuggestion[];
  createdAt: string;
  isStarter?: boolean;
  mode?: "live" | "demo";
}

export interface Conversation {
  id: string;
  scenarioId: ScenarioId;
  messages: ChatMessage[];
  startedAt: string;
  updatedAt: string;
}

export interface WeakSpot {
  id: string;
  topic: GrammarTopic;
  pattern: string;
  labelAr: string;
  labelEn: string;
  count: number;
  lastSeen: string;
}

export type VocabularyCategory =
  | "home"
  | "people"
  | "food"
  | "city"
  | "work"
  | "health"
  | "shopping"
  | "other";

export interface VocabCard {
  id: string;
  word: string;
  article: GrammarArticle | null;
  plural: string | null;
  translationAr: string;
  translationEn: string;
  exampleDe: string;
  exampleAr: string;
  level: CefrLevel;
  category: VocabularyCategory;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  createdAt: string;
  lastReviewedAt: string | null;
  source: "seed" | "chat" | "manual";
}

export type StarterVocabCard = Omit<
  VocabCard,
  | "ease"
  | "intervalDays"
  | "repetitions"
  | "dueDate"
  | "createdAt"
  | "lastReviewedAt"
  | "source"
>;

export type SrsQuality = "again" | "hard" | "good" | "easy";

export interface DrillResult {
  id: string;
  topic: GrammarTopic;
  pattern: string;
  questionId: string;
  correct: boolean;
  createdAt: string;
}

export interface DailyActivity {
  date: string;
  xp: number;
  seconds: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastPracticeDate: string | null;
}

export interface Profile {
  displayName: string;
  level: CefrLevel;
  dailyGoalMinutes: number;
  uiLanguage: UiLanguage;
  nativeDialect: NativeDialect;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface CurriculumCompletion {
  lessonId: string;
  completedAt: string;
  /** Optional listening/pronunciation score for the lesson check. */
  score?: number;
}

export interface ProgressState {
  version: 1;
  ownerId: string;
  profile: Profile;
  xp: number;
  weakSpots: WeakSpot[];
  vocabCards: VocabCard[];
  drillResults: DrillResult[];
  conversations: Conversation[];
  activity: DailyActivity[];
  streak: StreakData;
  curriculumCompletions: CurriculumCompletion[];
}

/* ------------------------------------------------------------------ */
/* Structured A1–B1 curriculum                                         */
/* ------------------------------------------------------------------ */

export type CurriculumActivityKind =
  | "scenario"
  | "grammar"
  | "vocabulary"
  | "builder"
  | "listening"
  | "pronunciation";

export interface CurriculumActivity {
  kind: CurriculumActivityKind;
  href: string;
  labelAr: string;
  labelEn: string;
}

export interface CurriculumLesson {
  id: string;
  unitId: string;
  level: CefrLevel;
  /** 1-based position inside its unit. */
  order: number;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  goalAr: string;
  goalEn: string;
  minutes: number;
  xp: number;
  activities: CurriculumActivity[];
}

export interface CurriculumUnit {
  id: string;
  level: CefrLevel;
  /** 1-based position across the full path. */
  order: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  theme: "teal" | "orange" | "blue" | "rose" | "green";
  lessons: CurriculumLesson[];
}

/* ------------------------------------------------------------------ */
/* Listening dictation                                                 */
/* ------------------------------------------------------------------ */

export interface DictationClip {
  id: string;
  level: CefrLevel;
  titleAr: string;
  titleEn: string;
  textDe: string;
  translationAr: string;
  translationEn: string;
  hintAr: string;
  hintEn: string;
  topic: GrammarTopic;
  focusLabelAr: string;
  focusLabelEn: string;
}

export type DictationWordStatus = "correct" | "wrong" | "missing" | "extra";

export interface DictationWordDiff {
  expected: string | null;
  actual: string | null;
  status: DictationWordStatus;
}

export interface DictationScore {
  accuracy: number;
  correctWords: number;
  totalWords: number;
  passed: boolean;
  diff: DictationWordDiff[];
}

/* ------------------------------------------------------------------ */
/* Pronunciation coach                                                 */
/* ------------------------------------------------------------------ */

export type PronunciationSoundId =
  | "ch"
  | "sch"
  | "ue"
  | "oe"
  | "ae"
  | "r"
  | "w"
  | "v"
  | "z"
  | "ei"
  | "ie"
  | "eu"
  | "sp_st"
  | "final_er";

export interface PronunciationSounds {
  id: PronunciationSoundId;
  symbol: string;
  labelAr: string;
  labelEn: string;
  tipAr: string;
  tipEn: string;
}

export interface PronunciationPhrase {
  id: string;
  level: CefrLevel;
  textDe: string;
  translationAr: string;
  translationEn: string;
  tipAr: string;
  tipEn: string;
  focus: PronunciationSoundId[];
}

export type PronunciationSoundStatus = "clear" | "almost" | "retry";

export interface PronunciationSoundFeedback {
  id: PronunciationSoundId;
  symbol: string;
  labelAr: string;
  labelEn: string;
  tipAr: string;
  tipEn: string;
  accuracy: number;
  status: PronunciationSoundStatus;
  words: string[];
}

export interface PronunciationScore {
  accuracy: number;
  wordAccuracy: number;
  correctWords: number;
  totalWords: number;
  passed: boolean;
  words: DictationWordDiff[];
  sounds: PronunciationSoundFeedback[];
}

export type ScenarioId =
  | "cafe"
  | "doctor"
  | "interview"
  | "office"
  | "shopping"
  | "free"
  | `custom_${string}`;

export type ScenarioFormality = "du" | "Sie";
export type ScenarioTone = "friendly" | "strict";

export interface ScenarioKeyVocab {
  de: string;
  article: GrammarArticle | null;
  plural: string | null;
  ar: string;
}

export interface ScenarioPhrase {
  de: string;
  ar: string;
}

/** A learner-owned scenario generated by AI and editable in the preview. */
export interface CustomScenario {
  id: `custom_${string}`;
  titleDe: string;
  titleAr: string;
  emoji: string;
  settingAr: string;
  aiRoleDe: string;
  learnerRoleAr: string;
  goalAr: string;
  level: CefrLevel;
  formality: ScenarioFormality;
  tone: ScenarioTone;
  grammarFocus: string[];
  keyVocab: ScenarioKeyVocab[];
  usefulPhrases: ScenarioPhrase[];
  openingDe: string;
  openingAr: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomScenarioDraft = Omit<
  CustomScenario,
  "id" | "createdAt" | "updatedAt"
>;

export interface Scenario {
  id: ScenarioId;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  level: CefrLevel;
  durationMinutes: number;
  settingAr: string;
  settingEn: string;
  aiRoleAr: string;
  aiRoleEn: string;
  openingDe: string;
  openingAr: string;
  openingEn: string;
  color: "teal" | "orange" | "blue" | "rose" | "green";
  goalsAr: string[];
  goalsEn: string[];
  /** Custom scenarios show their generated emoji instead of a generic icon. */
  emoji?: string;
}

export interface DrillQuestion {
  id: string;
  /** Analytics bucket that must stay inside the five Supabase values. */
  topic: GrammarTopic;
  /** Practice category used by the grammar hub and AI generation. */
  drillTopic?: DrillTopic;
  pattern: string;
  level: CefrLevel;
  promptBefore: string;
  promptAfter: string;
  hintAr: string;
  hintEn: string;
  options: string[];
  correctAnswer: string;
  translationAr: string;
  translationEn: string;
  explanationAr: string;
  explanationEn: string;
  weakSpotAr: string;
  weakSpotEn: string;
  caseLabelAr?: string;
  caseLabelEn?: string;
}

export interface SentenceToken {
  id: string;
  text: string;
  role:
    | "subject"
    | "verb"
    | "verb_end"
    | "object"
    | "time"
    | "place"
    | "conjunction"
    | "particle"
    | "adjective"
    | "other";
}

export interface SentenceExercise {
  id: string;
  level: CefrLevel;
  kind: "verb-second" | "verb-final" | "separable" | "question" | "general";
  promptAr: string;
  promptEn: string;
  translationAr: string;
  translationEn: string;
  tokens: SentenceToken[];
  correctOrder: string[];
  explanationAr: string;
  explanationEn: string;
  structureLabels: Array<{
    role: SentenceToken["role"];
    labelAr: string;
    labelEn: string;
  }>;
}

export interface PlacementQuestion {
  id: string;
  level: CefrLevel;
  questionAr: string;
  questionEn: string;
  sentenceBefore: string;
  sentenceAfter: string;
  options: string[];
  correctAnswer: string;
  explanationAr: string;
}

export type AiAction = "explain" | "simplify" | "translate";

export interface WordDetails {
  word: string;
  article: GrammarArticle | null;
  plural: string | null;
  part_of_speech: string;
  meaning_ar: string;
  meaning_en: string;
  example_de: string;
  example_ar: string;
}
