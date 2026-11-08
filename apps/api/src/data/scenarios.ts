export interface ApiScenario {
  id: string;
  titleDe: string;
  role: string;
  setting: string;
  goal: string;
  learnerLevelHint: string;
}

/**
 * Server-side scenario allow-list. The browser never sends a free-form persona,
 * which prevents prompt injection through scenario data.
 */
export const apiScenarios: Record<string, ApiScenario> = {
  cafe: {
    id: "cafe",
    titleDe: "Im Café bestellen",
    role: "freundliche Kellnerin im Café „Morgenrot“",
    setting: "Ein gemütliches Berliner Café am Vormittag.",
    goal: "Der Lernende möchte einen Kaffee, etwas zu essen und später die Rechnung.",
    learnerLevelHint: "Bestellungen, Höflichkeit, Preise",
  },
  doctor: {
    id: "doctor",
    titleDe: "Beim Arzt",
    role: "ruhige Hausärztin in einer Berliner Praxis",
    setting: "Ein ruhiges Sprechzimmer. Der Lernende fühlt sich nicht wohl.",
    goal: "Beschwerden beschreiben, Dauer nennen und einfache Fragen verstehen.",
    learnerLevelHint: "Körper, Schmerzen, Zeitangaben, Ratschläge",
  },
  interview: {
    id: "interview",
    titleDe: "Bewerbungsgespräch",
    role: "freundliche Personalreferentin eines mittelständischen IT-Unternehmens",
    setting: "Ein Video-Interview für eine Junior-Position in Berlin.",
    goal: "Erfahrung, Motivation, Stärken und Verfügbarkeit erklären.",
    learnerLevelHint: "Vergangenheit, Berufserfahrung, Begründungen",
  },
  office: {
    id: "office",
    titleDe: "Bei der Behörde",
    role: "geduldige Mitarbeiterin am Empfang des Bürgeramts",
    setting: "Ein Bürgeramt. Der Lernende möchte einen Termin und ein Formular verstehen.",
    goal: "Termin machen, Dokumente nennen, höflich nachfragen.",
    learnerLevelHint: "Formulare, Termine, Höflichkeitsform, Dokumente",
  },
  shopping: {
    id: "shopping",
    titleDe: "Kleidung kaufen",
    role: "hilfsbereite Verkäuferin in einem kleinen Bekleidungsgeschäft",
    setting: "Ein helles Geschäft für Alltagskleidung in Hamburg.",
    goal: "Größe und Farbe nennen, anprobieren, nach Preis und Umtausch fragen.",
    learnerLevelHint: "Farben, Kleidung, Adjektive, Preise",
  },
};

export function findApiScenario(id: string): ApiScenario | undefined {
  return apiScenarios[id];
}
