import type {
  CustomScenario,
  Formality,
  ScenarioTone,
} from "../schemas.js";

export interface ApiKeyVocab {
  de: string;
  article?: "der" | "die" | "das" | null;
  plural: string | null;
  ar: string;
}

export interface ApiUsefulPhrase {
  de: string;
  ar: string;
}

export interface ApiScenario {
  id: string;
  titleDe: string;
  role: string;
  setting: string;
  goal: string;
  learnerLevelHint: string;
  /** Who the learner plays, so the tutor can keep both sides in character. */
  learnerRole: string;
  formality: Formality;
  tone: ScenarioTone;
  grammarFocus: string[];
  keyVocab: ApiKeyVocab[];
  usefulPhrases: ApiUsefulPhrase[];
}

/**
 * Server-side scenario allow-list. The browser never sends a free-form persona
 * for built-in scenarios, which prevents prompt injection through scenario data.
 * Custom scenarios are validated against the shared Zod contract before use.
 */
export const apiScenarios: Record<string, ApiScenario> = {
  cafe: {
    id: "cafe",
    titleDe: "Im Café bestellen",
    role: "freundliche Kellnerin im Café „Morgenrot“",
    setting: "Ein gemütliches Berliner Café am Vormittag.",
    goal: "Der Lernende möchte einen Kaffee, etwas zu essen und später die Rechnung.",
    learnerLevelHint: "Bestellungen, Höflichkeit, Preise",
    learnerRole: "Gast, der etwas bestellen und bezahlen möchte",
    formality: "Sie",
    tone: "friendly",
    grammarFocus: ["Höflichkeitsform Sie", "möchten + Akkusativ", "W-Fragen"],
    keyVocab: [
      { de: "Kaffee", article: "der", plural: "die Kaffees", ar: "قهوة" },
      { de: "Kuchen", article: "der", plural: "die Kuchen", ar: "كيك" },
      {
        de: "Rechnung",
        article: "die",
        plural: "die Rechnungen",
        ar: "الفاتورة",
      },
    ],
    usefulPhrases: [
      { de: "Ich möchte …, bitte.", ar: "عايز …، لو سمحت." },
      { de: "Die Rechnung, bitte.", ar: "الحساب، لو سمحت." },
    ],
  },
  doctor: {
    id: "doctor",
    titleDe: "Beim Arzt",
    role: "ruhige Hausärztin in einer Berliner Praxis",
    setting: "Ein ruhiges Sprechzimmer. Der Lernende fühlt sich nicht wohl.",
    goal: "Beschwerden beschreiben, Dauer nennen und einfache Fragen verstehen.",
    learnerLevelHint: "Körper, Schmerzen, Zeitangaben, Ratschläge",
    learnerRole: "Patientin oder Patient mit Beschwerden",
    formality: "Sie",
    tone: "friendly",
    grammarFocus: ["seit + Dativ", "Schmerzen haben", "Perfekt"],
    keyVocab: [
      { de: "Schmerzen", article: "die", plural: "die Schmerzen", ar: "ألم" },
      {
        de: "Termin",
        article: "der",
        plural: "die Termine",
        ar: "ميعاد",
      },
      {
        de: "Krankmeldung",
        article: "die",
        plural: "die Krankmeldungen",
        ar: "شهادة مرضية",
      },
    ],
    usefulPhrases: [
      { de: "Ich habe seit … Schmerzen.", ar: "عندي ألم من …" },
      { de: "Was soll ich tun?", ar: "أعمل إيه؟" },
    ],
  },
  interview: {
    id: "interview",
    titleDe: "Bewerbungsgespräch",
    role: "freundliche Personalreferentin eines mittelständischen IT-Unternehmens",
    setting: "Ein Video-Interview für eine Junior-Position in Berlin.",
    goal: "Erfahrung, Motivation, Stärken und Verfügbarkeit erklären.",
    learnerLevelHint: "Vergangenheit, Berufserfahrung, Begründungen",
    learnerRole: "Bewerberin oder Bewerber für eine Junior-Stelle",
    formality: "Sie",
    tone: "friendly",
    grammarFocus: ["Perfekt", "weil / denn", "Modalverben"],
    keyVocab: [
      {
        de: "Erfahrung",
        article: "die",
        plural: "die Erfahrungen",
        ar: "خبرة",
      },
      { de: "Stelle", article: "die", plural: "die Stellen", ar: "وظيفة" },
      { de: "Stärke", article: "die", plural: "die Stärken", ar: "نقطة قوة" },
    ],
    usefulPhrases: [
      { de: "Ich habe … Jahre Erfahrung.", ar: "عندي … سنين خبرة." },
      { de: "Ich interessiere mich für …", ar: "أنا مهتم بـ…" },
    ],
  },
  office: {
    id: "office",
    titleDe: "Bei der Behörde",
    role: "geduldige Mitarbeiterin am Empfang des Bürgeramts",
    setting: "Ein Bürgeramt. Der Lernende möchte einen Termin und ein Formular verstehen.",
    goal: "Termin machen, Dokumente nennen, höflich nachfragen.",
    learnerLevelHint: "Formulare, Termine, Höflichkeitsform, Dokumente",
    learnerRole: "Person, die einen Termin braucht und Unterlagen abgibt",
    formality: "Sie",
    tone: "friendly",
    grammarFocus: ["Höflichkeitsform Sie", "Akkusativ", "Fragen mit haben"],
    keyVocab: [
      { de: "Termin", article: "der", plural: "die Termine", ar: "ميعاد" },
      {
        de: "Pass",
        article: "der",
        plural: "die Pässe",
        ar: "جواز سفر",
      },
      {
        de: "Formular",
        article: "das",
        plural: "die Formulare",
        ar: "استمارة",
      },
    ],
    usefulPhrases: [
      { de: "Ich brauche einen Termin.", ar: "محتاج ميعاد." },
      { de: "Können Sie das bitte wiederholen?", ar: "تقدر تعيد تاني، لو سمحت؟" },
    ],
  },
  shopping: {
    id: "shopping",
    titleDe: "Kleidung kaufen",
    role: "hilfsbereite Verkäuferin in einem kleinen Bekleidungsgeschäft",
    setting: "Ein helles Geschäft für Alltagskleidung in Hamburg.",
    goal: "Größe und Farbe nennen, anprobieren, nach Preis und Umtausch fragen.",
    learnerLevelHint: "Farben, Kleidung, Adjektive, Preise",
    learnerRole: "Kundin oder Kunde, der Kleidung sucht",
    formality: "Sie",
    tone: "friendly",
    grammarFocus: ["Akkusativ", "Adjektivendungen", "Fragen mit welche"],
    keyVocab: [
      { de: "Größe", article: "die", plural: "die Größen", ar: "مقاس" },
      {
        de: "Umkleidekabine",
        article: "die",
        plural: "die Umkleidekabinen",
        ar: "غرفة القياس",
      },
      { de: "Preis", article: "der", plural: "die Preise", ar: "سعر" },
    ],
    usefulPhrases: [
      { de: "Haben Sie das in Größe …?", ar: "عندك ده بمقاس …؟" },
      { de: "Kann ich das anprobieren?", ar: "أقدر أقيسه؟" },
    ],
  },
};

export function findApiScenario(id: string): ApiScenario | undefined {
  return apiScenarios[id];
}

/**
 * Convert a validated, learner-authored scenario into the internal role-play
 * shape. Every value is already length-limited by `customScenarioSchema`; the
 * tutor prompt still treats these strings purely as scenario data.
 */
export function customScenarioToApiScenario(
  scenario: CustomScenario,
): ApiScenario {
  return {
    id: "custom",
    titleDe: scenario.title_de,
    role: scenario.ai_role_de,
    setting: scenario.setting_ar,
    goal: scenario.goal_ar,
    learnerLevelHint: scenario.grammar_focus.join(", "),
    learnerRole: scenario.learner_role_ar,
    formality: scenario.formality,
    tone: scenario.tone,
    grammarFocus: scenario.grammar_focus,
    keyVocab: scenario.key_vocab,
    usefulPhrases: scenario.useful_phrases,
  };
}
