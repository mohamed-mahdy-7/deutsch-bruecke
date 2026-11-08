import type { PlacementQuestion } from "@/types/domain";

/** Five quick placement items used during onboarding. */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: "placement-1",
    level: "A1",
    questionAr: "اختار الأداة الصح:",
    questionEn: "Choose the correct article:",
    sentenceBefore: "",
    sentenceAfter: " Kind spielt im Garten.",
    options: ["Der", "Die", "Das", "Den"],
    correctAnswer: "Das",
    explanationAr: "«Kind» اسم محايد، فبياخد «das».",
  },
  {
    id: "placement-2",
    level: "A1",
    questionAr: "كمّل الجملة:",
    questionEn: "Complete the sentence:",
    sentenceBefore: "Ich trinke ",
    sentenceAfter: " Kaffee.",
    options: ["ein", "eine", "einen", "einem"],
    correctAnswer: "einen",
    explanationAr: "«Kaffee» مذكّر، وبعد فعل بياخد مفعول مباشر بنستخدم «einen».",
  },
  {
    id: "placement-3",
    level: "A2",
    questionAr: "اختار الأداة الصح:",
    questionEn: "Choose the correct article:",
    sentenceBefore: "Wir wohnen in ",
    sentenceAfter: " kleinen Wohnung.",
    options: ["eine", "einer", "einen", "einem"],
    correctAnswer: "einer",
    explanationAr: "«in» مع مكان ثابت بتاخد Dativ، و«Wohnung» مؤنّث، فبنقول «einer».",
  },
  {
    id: "placement-4",
    level: "A2",
    questionAr: "اختار أداة الربط المناسبة:",
    questionEn: "Choose the correct connector:",
    sentenceBefore: "Ich bleibe zu Hause, ",
    sentenceAfter: " ich krank bin.",
    options: ["weil", "dass", "oder", "denn"],
    correctAnswer: "weil",
    explanationAr: "«weil» معناها «لأن»، وبعدها الفعل بيروح لآخر الجملة: weil ich krank bin.",
  },
  {
    id: "placement-5",
    level: "B1",
    questionAr: "اختار الأداة الصح:",
    questionEn: "Choose the correct article:",
    sentenceBefore: "Die Farbe ",
    sentenceAfter: " Wand ist weiß.",
    options: ["der", "die", "dem", "den"],
    correctAnswer: "der",
    explanationAr: "هنا إضافة/ملكية بـ Genitiv. «Wand» مؤنّث، وفي Genitiv بنقول «der Wand».",
  },
];

export function recommendLevelFromPlacement(score: number): "A1" | "A2" | "B1" {
  if (score <= 1) return "A1";
  if (score <= 3) return "A2";
  return "B1";
}
