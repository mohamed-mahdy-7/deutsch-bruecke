import type { Scenario } from "@/types/domain";

export const SCENARIOS: Scenario[] = [
  {
    id: "cafe",
    titleAr: "في المقهى",
    titleEn: "At the café",
    descriptionAr: "اطلب قهوة وحاجة حلوة، واسأل عن الحساب بلباقة.",
    descriptionEn: "Order coffee and something sweet, then ask for the bill politely.",
    level: "A1",
    durationMinutes: 7,
    settingAr: "مقهى صغير في برلين",
    settingEn: "A cosy café in Berlin",
    aiRoleAr: "نادلة ودودة",
    aiRoleEn: "A friendly server",
    openingDe:
      "Guten Morgen! Willkommen im Café Morgenrot. Was möchten Sie bestellen?",
    openingAr:
      "صباح الخير! أهلًا بيك في مقهى Morgenrot. تحب تطلب إيه؟",
    openingEn:
      "Good morning! Welcome to Café Morgenrot. What would you like to order?",
    color: "orange",
    goalsAr: ["اطلب مشروب وأكل", "استخدم möchten بسلاسة", "اسأل عن الحساب"],
    goalsEn: ["Order a drink and food", "Use möchten naturally", "Ask for the bill"],
  },
  {
    id: "doctor",
    titleAr: "عند الدكتور",
    titleEn: "At the doctor",
    descriptionAr: "اشرح إحساسك ومدّة الأعراض، وافهم نصايح الدكتور.",
    descriptionEn: "Describe symptoms and duration, and understand simple advice.",
    level: "A2",
    durationMinutes: 8,
    settingAr: "عيادة طبيب عام في برلين",
    settingEn: "A GP practice in Berlin",
    aiRoleAr: "دكتورة هادئة",
    aiRoleEn: "A calm doctor",
    openingDe:
      "Guten Tag, nehmen Sie bitte Platz. Was fehlt Ihnen denn?",
    openingAr: "نهارك سعيد، اتفضل اقعد. حاسس بإيه؟",
    openingEn: "Good afternoon, please take a seat. What seems to be the problem?",
    color: "green",
    goalsAr: ["اوصف ألم أو تعب", "قول من إمتى", "اسأل عن الدوا"],
    goalsEn: ["Describe pain or illness", "Say since when", "Ask about medicine"],
  },
  {
    id: "interview",
    titleAr: "مقابلة شغل",
    titleEn: "Job interview",
    descriptionAr: "قدّم نفسك، اتكلم عن خبرتك، وجاوب أسئلة المقابلة.",
    descriptionEn: "Introduce yourself, discuss experience and answer interview questions.",
    level: "B1",
    durationMinutes: 12,
    settingAr: "مقابلة فيديو لوظيفة junior",
    settingEn: "A video interview for a junior role",
    aiRoleAr: "مسؤولة توظيف ودودة",
    aiRoleEn: "A friendly recruiter",
    openingDe:
      "Herzlich willkommen! Schön, dass Sie da sind. Erzählen Sie mir bitte kurz von sich.",
    openingAr:
      "أهلًا وسهلًا! مبسوطة إنك معانا. عرّفني بنفسك باختصار.",
    openingEn:
      "Welcome! Lovely to have you here. Please tell me a little about yourself.",
    color: "blue",
    goalsAr: ["قدّم نفسك", "استخدم Perfekt عن خبرتك", "اشرح أسبابك"],
    goalsEn: ["Introduce yourself", "Use Perfekt for experience", "Explain reasons"],
  },
  {
    id: "office",
    titleAr: "في مكتب الخدمات",
    titleEn: "At the Bürgeramt",
    descriptionAr: "اطلب ميعاد، افهم المستندات المطلوبة، واسأل لو مش واضح.",
    descriptionEn: "Book an appointment, understand documents and ask for clarification.",
    level: "A2",
    durationMinutes: 9,
    settingAr: "مكتب تسجيل سكان في برلين",
    settingEn: "A Berlin residents' registration office",
    aiRoleAr: "موظفة استقبال صبورة",
    aiRoleEn: "A patient receptionist",
    openingDe:
      "Guten Tag. Wie kann ich Ihnen helfen? Haben Sie schon einen Termin?",
    openingAr: "نهارك سعيد. أقدر أساعدك إزاي؟ عندك ميعاد بالفعل؟",
    openingEn: "Good day. How can I help? Do you already have an appointment?",
    color: "teal",
    goalsAr: ["اطلب ميعاد", "قول اسم المستند", "اطلب التوضيح بأدب"],
    goalsEn: ["Book an appointment", "Name a document", "Ask politely for clarification"],
  },
  {
    id: "shopping",
    titleAr: "شراء هدوم",
    titleEn: "Clothes shopping",
    descriptionAr: "اسأل عن المقاس واللون، جرّب، واعرف سياسة التغيير.",
    descriptionEn: "Ask about size and colour, try things on and ask about returns.",
    level: "A1",
    durationMinutes: 7,
    settingAr: "محل هدوم صغير في هامبورج",
    settingEn: "A small clothes shop in Hamburg",
    aiRoleAr: "بائعة مساعدة",
    aiRoleEn: "A helpful shop assistant",
    openingDe:
      "Guten Tag! Kann ich Ihnen helfen? Suchen Sie etwas Bestimmtes?",
    openingAr: "أهلًا! أقدر أساعدك؟ بتدور على حاجة معينة؟",
    openingEn: "Hello! Can I help you? Are you looking for something specific?",
    color: "rose",
    goalsAr: ["قول المقاس واللون", "اطلب غرفة القياس", "اسأل عن التغيير"],
    goalsEn: ["Say your size and colour", "Ask for the fitting room", "Ask about returns"],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
