import type { DrillQuestionModel, DrillTopic } from "../schemas.js";
import { drillPromptKey } from "../lib/drill.js";

type DrillLevel = "A1" | "A2" | "B1";

export interface DrillBankItem {
  level: DrillLevel;
  question: DrillQuestionModel;
}

interface Seed {
  level: DrillLevel;
  pattern: string;
  before: string;
  after: string;
  hintAr: string;
  hintEn: string;
  options: [string, string, string, string];
  answer: string;
  translationAr: string;
  translationEn: string;
  explanationAr: string;
  explanationEn: string;
  weakSpotAr: string;
  weakSpotEn: string;
}

function q(seed: Seed): DrillBankItem {
  return {
    level: seed.level,
    question: {
      pattern: seed.pattern,
      prompt_before: seed.before,
      prompt_after: seed.after,
      hint_ar: seed.hintAr,
      hint_en: seed.hintEn,
      options: [...seed.options],
      correct_answer: seed.answer,
      translation_ar: seed.translationAr,
      translation_en: seed.translationEn,
      explanation_ar: seed.explanationAr,
      explanation_en: seed.explanationEn,
      weak_spot_ar: seed.weakSpotAr,
      weak_spot_en: seed.weakSpotEn,
    },
  };
}

const articleSeeds: Seed[] = [
  {
    level: "A1",
    pattern: "nominative-article-masculine",
    before: "",
    after: "Mann wohnt hier.",
    hintAr: "بص على جنس الاسم ودوره في الجملة.",
    hintEn: "Check the noun's gender and its role.",
    options: ["Der", "Die", "Das", "Den"],
    answer: "Der",
    translationAr: "الراجل ساكن هنا.",
    translationEn: "The man lives here.",
    explanationAr:
      "«Mann» مذكّر، وهو الفاعل، فNominativ بياخد «der». افتكر إن المذكّر لونه أزرق.",
    explanationEn:
      "“Mann” is masculine and the subject, so the nominative article is “der”.",
    weakSpotAr: "أداة المذكّر في Nominativ",
    weakSpotEn: "Masculine nominative article",
  },
  {
    level: "A1",
    pattern: "nominative-article-feminine",
    before: "",
    after: "Frau liest ein Buch.",
    hintAr: "الاسم مؤنّث، وهو اللي بيعمل الفعل.",
    hintEn: "The noun is feminine and performs the action.",
    options: ["Die", "Der", "Das", "Den"],
    answer: "Die",
    translationAr: "الست بتقرأ كتاب.",
    translationEn: "The woman reads a book.",
    explanationAr:
      "«Frau» مؤنّث وفاعل؛ المؤنّث في Nominativ بياخد «die». لونه أحمر.",
    explanationEn:
      "“Frau” is feminine and the subject, so the nominative article is “die”.",
    weakSpotAr: "أداة المؤنّث في Nominativ",
    weakSpotEn: "Feminine nominative article",
  },
  {
    level: "A1",
    pattern: "nominative-article-neuter",
    before: "",
    after: "Kind spielt im Garten.",
    hintAr: "فكّر في الأسماء المحايدة: das.",
    hintEn: "Remember the neuter article: das.",
    options: ["Das", "Der", "Die", "Den"],
    answer: "Das",
    translationAr: "الطفل بيلعب في الجنينة.",
    translationEn: "The child plays in the garden.",
    explanationAr:
      "«Kind» محايد؛ المحايد في Nominativ بياخد «das». لونه أخضر.",
    explanationEn:
      "“Kind” is neuter, so the nominative article is “das”.",
    weakSpotAr: "أداة المحايد في Nominativ",
    weakSpotEn: "Neuter nominative article",
  },
  {
    level: "A1",
    pattern: "accusative-article-masculine",
    before: "Ich sehe",
    after: "Hund.",
    hintAr: "الفعل «sehe» بياخد مفعول مباشر.",
    hintEn: "“sehe” takes a direct object.",
    options: ["den", "der", "dem", "die"],
    answer: "den",
    translationAr: "أنا شايف الكلب.",
    translationEn: "I see the dog.",
    explanationAr:
      "«Hund» مذكّر ومفعول مباشر؛ Akkusativ بيحوّل «der» لـ «den».",
    explanationEn:
      "“Hund” is masculine and the direct object, so accusative changes “der” to “den”.",
    weakSpotAr: "أداة المذكّر في Akkusativ",
    weakSpotEn: "Masculine accusative article",
  },
  {
    level: "A1",
    pattern: "accusative-article-feminine",
    before: "Wir kaufen",
    after: "Tasche.",
    hintAr: "المؤنّث في Akkusativ ما بيتغيرش.",
    hintEn: "Feminine articles do not change in the accusative.",
    options: ["die", "der", "den", "das"],
    answer: "die",
    translationAr: "إحنا بنشتري الشنطة.",
    translationEn: "We are buying the bag.",
    explanationAr:
      "«Tasche» مؤنّث؛ في Akkusativ المؤنّث بيفضل «die» زي ما هو.",
    explanationEn:
      "“Tasche” is feminine, and the feminine accusative article stays “die”.",
    weakSpotAr: "أداة المؤنّث في Akkusativ",
    weakSpotEn: "Feminine accusative article",
  },
  {
    level: "A2",
    pattern: "dative-article-feminine",
    before: "Ich helfe",
    after: "Frau.",
    hintAr: "الفعل «helfen» بياخد Dativ.",
    hintEn: "The verb “helfen” takes the dative.",
    options: ["der", "die", "den", "dem"],
    answer: "der",
    translationAr: "أنا بساعد الست.",
    translationEn: "I help the woman.",
    explanationAr:
      "«helfen» بياخد Dativ؛ والمؤنّث في Dativ بيبقى «der».",
    explanationEn:
      "“helfen” takes the dative, where the feminine article becomes “der”.",
    weakSpotAr: "أداة المؤنّث في Dativ",
    weakSpotEn: "Feminine dative article",
  },
  {
    level: "A2",
    pattern: "dative-article-masculine",
    before: "Er dankt",
    after: "Lehrer.",
    hintAr: "«danken» من أفعال Dativ.",
    hintEn: "“danken” is a dative verb.",
    options: ["dem", "den", "der", "die"],
    answer: "dem",
    translationAr: "هو بيشكر المدرس.",
    translationEn: "He thanks the teacher.",
    explanationAr:
      "«danken» بياخد Dativ؛ المذكّر في Dativ بيبقى «dem».",
    explanationEn:
      "“danken” takes the dative, where the masculine article becomes “dem”.",
    weakSpotAr: "أداة المذكّر في Dativ",
    weakSpotEn: "Masculine dative article",
  },
  {
    level: "A1",
    pattern: "nominative-article-plural",
    before: "",
    after: "Kinder spielen draußen.",
    hintAr: "الجمع في Nominativ ليه أداة واحدة.",
    hintEn: "Plural nominative uses one article.",
    options: ["Die", "Der", "Das", "Den"],
    answer: "Die",
    translationAr: "الأطفال بيلعبوا برا.",
    translationEn: "The children play outside.",
    explanationAr:
      "الجمع في Nominativ بياخد «die» دايمًا، مهما كان جنس المفرد.",
    explanationEn:
      "The nominative plural article is always “die”, whatever the singular gender.",
    weakSpotAr: "أداة الجمع في Nominativ",
    weakSpotEn: "Plural nominative article",
  },
  {
    level: "A1",
    pattern: "accusative-article-masculine",
    before: "Sie besucht",
    after: "Arzt.",
    hintAr: "«besuchen» + مفعول مباشر.",
    hintEn: "“besuchen” takes a direct object.",
    options: ["den", "dem", "der", "die"],
    answer: "den",
    translationAr: "هي بزور الدكتور.",
    translationEn: "She visits the doctor.",
    explanationAr:
      "«Arzt» مذكّر ومفعول مباشر، فAkkusativ بياخد «den».",
    explanationEn:
      "“Arzt” is masculine and the direct object, so it takes the accusative “den”.",
    weakSpotAr: "أداة المذكّر في Akkusativ",
    weakSpotEn: "Masculine accusative article",
  },
  {
    level: "A2",
    pattern: "dative-article-plural",
    before: "Wir sprechen mit",
    after: "Studenten.",
    hintAr: "«mit» حرف جر بياخد Dativ.",
    hintEn: "“mit” always takes the dative.",
    options: ["den", "die", "der", "dem"],
    answer: "den",
    translationAr: "إحنا بنتكلم مع الطلبة.",
    translationEn: "We are talking with the students.",
    explanationAr:
      "«mit» بياخد Dativ؛ والجمع في Dativ بياخد «den» والاسم غالبًا بيزيد «n»: Studenten.",
    explanationEn:
      "“mit” takes the dative. The dative plural article is “den”, and the noun usually adds “n”: Studenten.",
    weakSpotAr: "أداة الجمع في Dativ",
    weakSpotEn: "Plural dative article",
  },
];

const caseSeeds: Seed[] = [
  {
    level: "A1",
    pattern: "accusative-direct-object-masculine",
    before: "Ich treffe",
    after: "Mann im Park.",
    hintAr: "مين اللي بيتلقى الفعل؟ ده المفعول المباشر.",
    hintEn: "Who receives the action? That is the direct object.",
    options: ["den", "der", "dem", "die"],
    answer: "den",
    translationAr: "أنا بلاقي الراجل في الحديقة.",
    translationEn: "I meet the man in the park.",
    explanationAr:
      "«Mann» مذكّر ومفعول مباشر؛ Akkusativ بياخد «den». في العربي الترتيب بيوضح المفعول، لكن في الألماني الأداة نفسها بتتغير.",
    explanationEn:
      "“Mann” is masculine and the direct object, so it takes accusative “den”. German marks the object on the article itself.",
    weakSpotAr: "Akkusativ للمذكّر",
    weakSpotEn: "Masculine accusative",
  },
  {
    level: "A1",
    pattern: "accusative-direct-object-neuter",
    before: "Wir kaufen",
    after: "Auto.",
    hintAr: "المحايد في Akkusativ بيفضل زي Nominativ.",
    hintEn: "Neuter stays the same in the accusative.",
    options: ["das", "dem", "den", "der"],
    answer: "das",
    translationAr: "إحنا بنشتري العربية.",
    translationEn: "We are buying the car.",
    explanationAr:
      "«Auto» محايد؛ وفي Akkusativ المحايد ما بيتغيرش، فبيفضل «das».",
    explanationEn:
      "“Auto” is neuter, and neuter does not change in the accusative, so it stays “das”.",
    weakSpotAr: "Akkusativ للمحايد",
    weakSpotEn: "Neuter accusative",
  },
  {
    level: "A2",
    pattern: "dative-verb-feminine",
    before: "Ich danke",
    after: "Lehrerin.",
    hintAr: "«danken» فعله Dativ مش Akkusativ.",
    hintEn: "“danken” takes dative, not accusative.",
    options: ["der", "die", "den", "dem"],
    answer: "der",
    translationAr: "أنا بشكر المدرسة.",
    translationEn: "I thank the teacher.",
    explanationAr:
      "«danken» من أفعال Dativ؛ المؤنّث في Dativ بياخد «der»، مش «die».",
    explanationEn:
      "“danken” is a dative verb; the feminine dative article is “der”, not “die”.",
    weakSpotAr: "أفعال Dativ",
    weakSpotEn: "Dative verbs",
  },
  {
    level: "A2",
    pattern: "dative-verb-masculine",
    before: "Wir helfen",
    after: "Nachbarn.",
    hintAr: "«helfen» بياخد Dativ.",
    hintEn: "“helfen” takes the dative.",
    options: ["dem", "den", "der", "die"],
    answer: "dem",
    translationAr: "إحنا بنساعد الجار.",
    translationEn: "We help the neighbour.",
    explanationAr:
      "«helfen» + Dativ؛ المذكّر في Dativ بياخد «dem».",
    explanationEn:
      "“helfen” takes the dative, where the masculine article is “dem”.",
    weakSpotAr: "أفعال Dativ",
    weakSpotEn: "Dative verbs",
  },
  {
    level: "A2",
    pattern: "dative-verb-neuter",
    before: "Er antwortet",
    after: "Kind.",
    hintAr: "«antworten» بياخد Dativ.",
    hintEn: "“antworten” takes the dative.",
    options: ["dem", "das", "den", "der"],
    answer: "dem",
    translationAr: "هو بيرد على الطفل.",
    translationEn: "He answers the child.",
    explanationAr:
      "«antworten» + Dativ؛ المحايد في Dativ بياخد «dem».",
    explanationEn:
      "“antworten” takes the dative, where the neuter article is “dem”.",
    weakSpotAr: "أفعال Dativ",
    weakSpotEn: "Dative verbs",
  },
  {
    level: "A1",
    pattern: "accusative-direct-object-feminine",
    before: "Sie fragt",
    after: "Frau.",
    hintAr: "«fragen» بياخد مفعول مباشر.",
    hintEn: "“fragen” takes a direct object.",
    options: ["die", "der", "den", "das"],
    answer: "die",
    translationAr: "هي بتسأل الست.",
    translationEn: "She asks the woman.",
    explanationAr:
      "«fragen» + Akkusativ؛ والمؤنّث في Akkusativ بيفضل «die».",
    explanationEn:
      "“fragen” takes the accusative, where the feminine article stays “die”.",
    weakSpotAr: "Akkusativ للمؤنّث",
    weakSpotEn: "Feminine accusative",
  },
  {
    level: "A2",
    pattern: "dative-preposition-plural",
    before: "Ich spreche mit",
    after: "Kollegen.",
    hintAr: "«mit» + Dativ دايمًا.",
    hintEn: "“mit” always takes the dative.",
    options: ["den", "die", "der", "dem"],
    answer: "den",
    translationAr: "أنا بتكلم مع الزملاء.",
    translationEn: "I am talking with the colleagues.",
    explanationAr:
      "«mit» بياخد Dativ؛ الجمع في Dativ بياخد «den» والاسم بياخد «n»: Kollegen.",
    explanationEn:
      "“mit” takes the dative. The dative plural article is “den”, and the noun adds “n”: Kollegen.",
    weakSpotAr: "Dativ بعد حروف الجر",
    weakSpotEn: "Dative after prepositions",
  },
  {
    level: "A1",
    pattern: "accusative-direct-object-plural",
    before: "Wir besuchen",
    after: "Freunde.",
    hintAr: "«besuchen» + مفعول مباشر جمع.",
    hintEn: "“besuchen” takes a plural direct object.",
    options: ["die", "den", "der", "dem"],
    answer: "die",
    translationAr: "إحنا بنزور الأصحاب.",
    translationEn: "We visit the friends.",
    explanationAr:
      "الجمع في Akkusativ بياخد «die»؛ مفيش تغيير عن Nominativ.",
    explanationEn:
      "The accusative plural article is “die”, the same as the nominative.",
    weakSpotAr: "Akkusativ للجمع",
    weakSpotEn: "Plural accusative",
  },
  {
    level: "A2",
    pattern: "dative-person-verb",
    before: "Der Lehrer erklärt",
    after: "Schüler die Regel.",
    hintAr: "اللي بنشرحله بياخد Dativ.",
    hintEn: "The person receiving the explanation takes the dative.",
    options: ["dem", "den", "der", "die"],
    answer: "dem",
    translationAr: "المدرس بيشرح للطالب القاعدة.",
    translationEn: "The teacher explains the rule to the student.",
    explanationAr:
      "«erklären» + Dativ للشخص؛ المذكّر بياخد «dem»، والمفعول التاني «die Regel» في Akkusativ.",
    explanationEn:
      "“erklären” takes a dative person (“dem Schüler”) and an accusative thing (“die Regel”).",
    weakSpotAr: "Dativ مع أفعال الشرح",
    weakSpotEn: "Dative with explaining verbs",
  },
  {
    level: "A1",
    pattern: "accusative-direct-object-masculine",
    before: "Sie liebt",
    after: "Hund.",
    hintAr: "«lieben» + مفعول مباشر.",
    hintEn: "“lieben” takes a direct object.",
    options: ["den", "dem", "der", "das"],
    answer: "den",
    translationAr: "هي بتحب الكلب.",
    translationEn: "She loves the dog.",
    explanationAr:
      "«lieben» + Akkusativ؛ «Hund» مذكّر فبياخد «den».",
    explanationEn:
      "“lieben” takes the accusative; masculine “Hund” becomes “den”.",
    weakSpotAr: "Akkusativ للمذكّر",
    weakSpotEn: "Masculine accusative",
  },
];

const prepositionSeeds: Seed[] = [
  {
    level: "A1",
    pattern: "wo-dative-neuter",
    before: "Das Buch liegt auf",
    after: "Tisch.",
    hintAr: "الحاجة ثابتة في مكان، فاسأل: Wo؟",
    hintEn: "The object is fixed in place, so ask: Wo?",
    options: ["dem", "den", "der", "die"],
    answer: "dem",
    translationAr: "الكتاب موضوع على الترابيزة.",
    translationEn: "The book is lying on the table.",
    explanationAr:
      "«liegen» معناها ثابت في مكان، فWo → Dativ. «Tisch» مذكّر وDativ بياخد «dem».",
    explanationEn:
      "“liegen” describes a fixed position, so Wo takes the dative. Masculine “Tisch” becomes “dem”.",
    weakSpotAr: "Wo + Dativ",
    weakSpotEn: "Wo + dative",
  },
  {
    level: "A1",
    pattern: "wohin-accusative-neuter",
    before: "Ich lege das Buch auf",
    after: "Tisch.",
    hintAr: "في حركة ووضع للحاجة، فاسأل: Wohin؟",
    hintEn: "There is movement onto the table, so ask: Wohin?",
    options: ["den", "dem", "der", "die"],
    answer: "den",
    translationAr: "أنا بحط الكتاب على الترابيزة.",
    translationEn: "I put the book onto the table.",
    explanationAr:
      "«legen» فيها حركة ووصول، فWohin → Akkusativ. «Tisch» مذكّر وAkkusativ بياخد «den».",
    explanationEn:
      "“legen” expresses movement towards a destination, so Wohin takes the accusative. Masculine “Tisch” becomes “den”.",
    weakSpotAr: "Wohin + Akkusativ",
    weakSpotEn: "Wohin + accusative",
  },
  {
    level: "A1",
    pattern: "wo-dative-neuter",
    before: "Die Katze schläft unter",
    after: "Sofa.",
    hintAr: "القطة نايمة ومش بتتحرك.",
    hintEn: "The cat is sleeping and not moving.",
    options: ["dem", "den", "der", "das"],
    answer: "dem",
    translationAr: "القطة نايمة تحت الكنبة.",
    translationEn: "The cat sleeps under the sofa.",
    explanationAr:
      "مكان ثابت → Dativ. «Sofa» محايد، وفي Dativ بياخد «dem».",
    explanationEn:
      "A fixed position takes the dative; neuter “Sofa” becomes “dem”.",
    weakSpotAr: "Wo + Dativ",
    weakSpotEn: "Wo + dative",
  },
  {
    level: "A2",
    pattern: "wohin-accusative-neuter",
    before: "Der Hund läuft unter",
    after: "Sofa.",
    hintAr: "الكلب بيتحرك لحد تحت الكنبة.",
    hintEn: "The dog is moving to a position under the sofa.",
    options: ["das", "dem", "den", "der"],
    answer: "das",
    translationAr: "الكلب بيجري ويروح تحت الكنبة.",
    translationEn: "The dog runs under the sofa.",
    explanationAr:
      "حركة واتجاه → Akkusativ. «Sofa» محايد، وفي Akkusativ بيفضل «das».",
    explanationEn:
      "Movement towards a destination takes the accusative; neuter “Sofa” stays “das”.",
    weakSpotAr: "Wohin + Akkusativ",
    weakSpotEn: "Wohin + accusative",
  },
  {
    level: "A1",
    pattern: "wo-dative-feminine",
    before: "Wir sind in",
    after: "Schule.",
    hintAr: "إحنا موجودين جوه المدرسة، مفيش انتقال.",
    hintEn: "We are inside the school, not moving into it.",
    options: ["der", "die", "den", "dem"],
    answer: "der",
    translationAr: "إحنا في المدرسة.",
    translationEn: "We are in the school.",
    explanationAr:
      "«sein + in» هنا معناها وجود ثابت → Dativ. المؤنّث «Schule» بياخد «der».",
    explanationEn:
      "“sein” here describes being inside, so the dative is used; feminine “Schule” becomes “der”.",
    weakSpotAr: "Wo + Dativ",
    weakSpotEn: "Wo + dative",
  },
  {
    level: "A2",
    pattern: "wohin-accusative-masculine",
    before: "Er stellt die Flasche in",
    after: "Kühlschrank.",
    hintAr: "«stellen» فيها حركة للحاجة.",
    hintEn: "“stellen” puts something into a new place.",
    options: ["den", "dem", "der", "das"],
    answer: "den",
    translationAr: "هو بيحط الزجاجة في التلاجة.",
    translationEn: "He puts the bottle into the fridge.",
    explanationAr:
      "حركة واتجاه → Akkusativ. «Kühlschrank» مذكّر فبياخد «den».",
    explanationEn:
      "Movement towards a destination takes the accusative; masculine “Kühlschrank” becomes “den”.",
    weakSpotAr: "Wohin + Akkusativ",
    weakSpotEn: "Wohin + accusative",
  },
  {
    level: "A2",
    pattern: "wo-dative-feminine",
    before: "Das Bild hängt an",
    after: "Wand.",
    hintAr: "الصورة معلّقة وثابتة في مكانها.",
    hintEn: "The picture is hanging in a fixed position.",
    options: ["der", "die", "den", "dem"],
    answer: "der",
    translationAr: "الصورة معلّقة على الحيطة.",
    translationEn: "The picture hangs on the wall.",
    explanationAr:
      "مكان ثابت → Dativ. «Wand» مؤنّث فبياخد «der».",
    explanationEn:
      "A fixed position takes the dative; feminine “Wand” becomes “der”.",
    weakSpotAr: "Wo + Dativ",
    weakSpotEn: "Wo + dative",
  },
  {
    level: "A2",
    pattern: "wohin-accusative-feminine",
    before: "Sie hängt das Bild an",
    after: "Wand.",
    hintAr: "في حركة لتعليق الصورة على الحيطة.",
    hintEn: "The picture is being moved onto the wall.",
    options: ["die", "der", "den", "dem"],
    answer: "die",
    translationAr: "هي بتعلّق الصورة على الحيطة.",
    translationEn: "She hangs the picture onto the wall.",
    explanationAr:
      "حركة واتجاه → Akkusativ. «Wand» مؤنّث، وفي Akkusativ بيفضل «die».",
    explanationEn:
      "Movement towards a destination takes the accusative; feminine “Wand” stays “die”.",
    weakSpotAr: "Wohin + Akkusativ",
    weakSpotEn: "Wohin + accusative",
  },
  {
    level: "A1",
    pattern: "wo-dative-neuter",
    before: "Die Kinder spielen vor",
    after: "Haus.",
    hintAr: "الأطفال بيلعبوا في مكان ثابت.",
    hintEn: "The children are playing in a fixed place.",
    options: ["dem", "das", "den", "der"],
    answer: "dem",
    translationAr: "الأطفال بيلعبوا قدام البيت.",
    translationEn: "The children play in front of the house.",
    explanationAr:
      "مكان ثابت → Dativ. «Haus» محايد فبياخد «dem».",
    explanationEn:
      "A fixed position takes the dative; neuter “Haus” becomes “dem”.",
    weakSpotAr: "Wo + Dativ",
    weakSpotEn: "Wo + dative",
  },
  {
    level: "A2",
    pattern: "wohin-accusative-neuter",
    before: "Die Kinder laufen vor",
    after: "Haus.",
    hintAr: "الأطفال بيتحركوا لحد قدام البيت.",
    hintEn: "The children move to a position in front of the house.",
    options: ["das", "dem", "den", "der"],
    answer: "das",
    translationAr: "الأطفال بيجروا لقدام البيت.",
    translationEn: "The children run in front of the house.",
    explanationAr:
      "حركة واتجاه → Akkusativ. «Haus» محايد فبيفضل «das».",
    explanationEn:
      "Movement towards a destination takes the accusative; neuter “Haus” stays “das”.",
    weakSpotAr: "Wohin + Akkusativ",
    weakSpotEn: "Wohin + accusative",
  },
];

const verbPositionSeeds: Seed[] = [
  {
    level: "A1",
    pattern: "verb-second-after-time",
    before: "Heute",
    after: " nach Berlin.",
    hintAr: "أول كلمة زمان؛ الفعل المصرّف ييجي تاني.",
    hintEn: "The first element is time; the conjugated verb comes second.",
    options: ["fahre ich", "ich fahre", "fahre", "ich fahren"],
    answer: "fahre ich",
    translationAr: "النهارده أنا مسافر برلين.",
    translationEn: "Today I am travelling to Berlin.",
    explanationAr:
      "«Heute» في المكان الأول، فالفعل «fahre» لازم ييجي تاني، وبعده الفاعل: Heute fahre ich …",
    explanationEn:
      "“Heute” occupies position one, so the verb “fahre” must come second, followed by the subject: Heute fahre ich …",
    weakSpotAr: "الفعل في المكان التاني",
    weakSpotEn: "Verb in second position",
  },
  {
    level: "A2",
    pattern: "perfekt-verb-frame",
    before: "Gestern",
    after: ".",
    hintAr: "في Perfekt: الفعل المساعد تاني، والـ Partizip في الآخر.",
    hintEn: "In the perfect tense, the auxiliary is second and the participle last.",
    options: [
      "bin ich ins Kino gegangen",
      "ich bin ins Kino gegangen",
      "ich ins Kino gegangen bin",
      "ins Kino bin ich gegangen",
    ],
    answer: "bin ich ins Kino gegangen",
    translationAr: "أنا رحت السينما امبارح.",
    translationEn: "I went to the cinema yesterday.",
    explanationAr:
      "«Gestern» في الأول، فالمساعد «bin» تاني، والفاعل بعده، والـ Partizip «gegangen» في آخر الجملة.",
    explanationEn:
      "“Gestern” is first, the auxiliary “bin” is second, then the subject, and the participle “gegangen” closes the sentence.",
    weakSpotAr: "ترتيب Perfekt",
    weakSpotEn: "Perfect tense word order",
  },
  {
    level: "A1",
    pattern: "yes-no-question-verb-first",
    before: "",
    after: " du heute Zeit?",
    hintAr: "سؤال نعم/لا بيبدأ بالفعل.",
    hintEn: "A yes/no question starts with the verb.",
    options: ["Hast", "Hast du", "Du hast", "Zeit hast"],
    answer: "Hast",
    translationAr: "عندك وقت النهارده؟",
    translationEn: "Do you have time today?",
    explanationAr:
      "السؤال اللي إجابته نعم/لا بيبدأ بالفعل المصرّف: Hast du …؟",
    explanationEn:
      "A yes/no question begins with the conjugated verb: Hast du …?",
    weakSpotAr: "السؤال بفعل في الأول",
    weakSpotEn: "Verb-first questions",
  },
  {
    level: "A1",
    pattern: "w-question-verb-second",
    before: "Wann",
    after: " du nach Hause?",
    hintAr: "أداة السؤال أولًا، والفعل بعدها على طول.",
    hintEn: "The question word comes first, then the verb immediately.",
    options: ["gehst", "du gehst", "gehen", "gehst du"],
    answer: "gehst",
    translationAr: "إمتى بتروح البيت؟",
    translationEn: "When do you go home?",
    explanationAr:
      "«Wann» في الأول، والفعل «gehst» تاني، وبعده الفاعل «du».",
    explanationEn:
      "“Wann” is first, the verb “gehst” is second, then the subject “du”.",
    weakSpotAr: "ترتيب سؤال W",
    weakSpotEn: "W-question order",
  },
  {
    level: "A2",
    pattern: "modal-verb-second",
    before: "Heute",
    after: " ich arbeiten.",
    hintAr: "الفعل المودال بيتصرّف في المكان التاني.",
    hintEn: "The modal verb is conjugated in position two.",
    options: ["muss", "müssen", "muss ich", "ich muss"],
    answer: "muss",
    translationAr: "النهارده لازم أشتغل.",
    translationEn: "Today I have to work.",
    explanationAr:
      "«Heute» أول، فالمودال «muss» تاني، والفاعل «ich» بعده، والإنفينيتيف «arbeiten» في الآخر.",
    explanationEn:
      "“Heute” is first, so the modal “muss” is second, then “ich”, with the infinitive “arbeiten” at the end.",
    weakSpotAr: "ترتيب الأفعال المودالة",
    weakSpotEn: "Modal verb order",
  },
  {
    level: "A1",
    pattern: "verb-second-after-time",
    before: "Am Montag",
    after: " Deutsch.",
    hintAr: "الزمن أولًا؛ الفعل تاني؛ الفاعل بعده.",
    hintEn: "Time first; verb second; subject after it.",
    options: ["lernen wir", "wir lernen", "lernen", "lernst du"],
    answer: "lernen wir",
    translationAr: "يوم الاتنين إحنا بنتعلم ألماني.",
    translationEn: "On Monday we study German.",
    explanationAr:
      "«Am Montag» في الأول، فالفعل «lernen» تاني، وبعده الفاعل «wir».",
    explanationEn:
      "“Am Montag” is first, the verb “lernen” is second, then the subject “wir”.",
    weakSpotAr: "الفعل في المكان التاني",
    weakSpotEn: "Verb in second position",
  },
  {
    level: "A2",
    pattern: "perfekt-sein-movement",
    before: "Wir",
    after: " gestern ins Kino gegangen.",
    hintAr: "فعل الحركة مع Perfekt بياخد «sein».",
    hintEn: "Movement verbs use “sein” in the perfect tense.",
    options: ["sind", "haben", "waren", "sein"],
    answer: "sind",
    translationAr: "إحنا رحنا السينما امبارح.",
    translationEn: "We went to the cinema yesterday.",
    explanationAr:
      "«gehen» فعل حركة، فPerfekt بياخد «sein»: wir sind gegangen. والمساعد في المكان التاني.",
    explanationEn:
      "“gehen” expresses movement, so the perfect tense uses “sein”: wir sind gegangen. The auxiliary sits in position two.",
    weakSpotAr: "Perfekt مع أفعال الحركة",
    weakSpotEn: "Perfect with movement verbs",
  },
  {
    level: "A1",
    pattern: "verb-second-after-time",
    before: "Im Sommer",
    after: ".",
    hintAr: "لو بدأت بظرف زمان، الفعل لازم ييجي بعده.",
    hintEn: "If you start with a time phrase, the verb must follow it.",
    options: [
      "fahre ich nach Italien",
      "ich fahre nach Italien",
      "nach Italien fahre ich",
      "fahre nach Italien ich",
    ],
    answer: "fahre ich nach Italien",
    translationAr: "في الصيف أنا بسافر إيطاليا.",
    translationEn: "In summer I travel to Italy.",
    explanationAr:
      "«Im Sommer» في المكان الأول، فالفعل «fahre» تاني، وبعده الفاعل «ich».",
    explanationEn:
      "“Im Sommer” is position one, so the verb “fahre” is second, followed by the subject “ich”.",
    weakSpotAr: "الفعل في المكان التاني",
    weakSpotEn: "Verb in second position",
  },
  {
    level: "A1",
    pattern: "verb-second-subject-first",
    before: "Meine Schwester",
    after: " heute Geburtstag.",
    hintAr: "الفاعل أول؛ الفعل تاني على طول.",
    hintEn: "The subject is first; the verb follows immediately.",
    options: ["hat", "haben", "hat sie", "sie hat"],
    answer: "hat",
    translationAr: "أختي عندها عيد ميلاد النهارده.",
    translationEn: "My sister has a birthday today.",
    explanationAr:
      "«Meine Schwester» هي الفاعل في المكان الأول، فالفعل «hat» تاني، وبعده باقي الجملة.",
    explanationEn:
      "“Meine Schwester” is the subject in position one, so the verb “hat” is second.",
    weakSpotAr: "الفعل في المكان التاني",
    weakSpotEn: "Verb in second position",
  },
  {
    level: "A1",
    pattern: "yes-no-question-verb-first",
    before: "Kannst",
    after: " mir bitte helfen?",
    hintAr: "السؤال بدأ بالمودال؛ مين اللي بعده؟",
    hintEn: "The question starts with the modal; who comes next?",
    options: ["du", "ihr", "ich", "wir"],
    answer: "du",
    translationAr: "تقدر تساعدني لو سمحت؟",
    translationEn: "Can you help me please?",
    explanationAr:
      "سؤال نعم/لا: الفعل المصرّف أولًا «Kannst»، وبعده الفاعل «du».",
    explanationEn:
      "In a yes/no question, the conjugated verb comes first (“Kannst”), then the subject “du”.",
    weakSpotAr: "السؤال بفعل في الأول",
    weakSpotEn: "Verb-first questions",
  },
];

const separableSeeds: Seed[] = [
  {
    level: "A1",
    pattern: "separable-aufstehen-prefix",
    before: "Ich stehe jeden Morgen um sechs",
    after: ".",
    hintAr: "«aufstehen» بتتقسم: الفعل في النص والبادئة في الآخر.",
    hintEn: "“aufstehen” splits: the verb stays in the middle and the prefix goes last.",
    options: ["auf", "an", "aus", "ein"],
    answer: "auf",
    translationAr: "أنا بصحى كل يوم الساعة ستة.",
    translationEn: "I get up at six every morning.",
    explanationAr:
      "«aufstehen» فعل منفصل: «stehe» في المكان التاني، و«auf» بتروح آخر الجملة.",
    explanationEn:
      "“aufstehen” is separable: “stehe” stays in position two and “auf” moves to the end.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A1",
    pattern: "separable-ankommen-prefix",
    before: "Der Zug kommt um acht Uhr",
    after: ".",
    hintAr: "«ankommen» = يوصل. البادئة بتروح الآخر.",
    hintEn: "“ankommen” means to arrive; the prefix goes to the end.",
    options: ["an", "auf", "aus", "mit"],
    answer: "an",
    translationAr: "القطر بيوصل الساعة تمانية.",
    translationEn: "The train arrives at eight o'clock.",
    explanationAr:
      "«ankommen» فعل منفصل: «kommt» في النص، و«an» في آخر الجملة.",
    explanationEn:
      "“ankommen” separates: “kommt” stays in the middle and “an” closes the sentence.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A1",
    pattern: "separable-anrufen-prefix",
    before: "Sie ruft ihre Mutter jeden Abend",
    after: ".",
    hintAr: "«anrufen» = يتصل. فكّر في مكان البادئة.",
    hintEn: "“anrufen” means to call; think about the prefix position.",
    options: ["an", "auf", "aus", "zu"],
    answer: "an",
    translationAr: "هي بتتصل بأمها كل مساء.",
    translationEn: "She calls her mother every evening.",
    explanationAr:
      "«anrufen» منفصل: «ruft» تاني، و«an» آخر الجملة.",
    explanationEn:
      "“anrufen” separates: “ruft” is second and “an” goes to the end.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A1",
    pattern: "separable-ausmachen-prefix",
    before: "Wir machen das Licht",
    after: ".",
    hintAr: "«ausmachen» = يطفي. البادئة آخر الجملة.",
    hintEn: "“ausmachen” means to switch off; the prefix ends the sentence.",
    options: ["aus", "an", "auf", "ein"],
    answer: "aus",
    translationAr: "إحنا بنطفي النور.",
    translationEn: "We switch off the light.",
    explanationAr:
      "«ausmachen» منفصل: «machen» في النص، و«aus» في الآخر.",
    explanationEn:
      "“ausmachen” separates: “machen” stays in the middle and “aus” comes last.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A2",
    pattern: "separable-aufraeumen-prefix",
    before: "Er räumt sein Zimmer",
    after: ".",
    hintAr: "«aufräumen» = يرتب. البادئة «auf» بتروح الآخر.",
    hintEn: "“aufräumen” means to tidy up; “auf” moves to the end.",
    options: ["auf", "aus", "an", "ein"],
    answer: "auf",
    translationAr: "هو بيرتب أوضته.",
    translationEn: "He tidies up his room.",
    explanationAr:
      "«aufräumen» منفصل: «räumt» تاني، و«auf» آخر الجملة.",
    explanationEn:
      "“aufräumen” separates: “räumt” is second and “auf” is at the end.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A2",
    pattern: "separable-einladen-prefix",
    before: "Ich lade dich zur Party",
    after: ".",
    hintAr: "«einladen» = يعزم. البادئة «ein» آخر الجملة.",
    hintEn: "“einladen” means to invite; “ein” ends the sentence.",
    options: ["ein", "auf", "an", "aus"],
    answer: "ein",
    translationAr: "أنا بعزمك على الحفلة.",
    translationEn: "I invite you to the party.",
    explanationAr:
      "«einladen» منفصل: «lade» تاني، و«ein» آخر الجملة.",
    explanationEn:
      "“einladen” separates: “lade” is second and “ein” closes the sentence.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A1",
    pattern: "separable-aufstehen-prefix",
    before: "Die Kinder stehen früh",
    after: ".",
    hintAr: "نفس فعل «aufstehen» بس مع الجمع.",
    hintEn: "Same verb “aufstehen”, now with a plural subject.",
    options: ["auf", "an", "aus", "zu"],
    answer: "auf",
    translationAr: "الأطفال بيصحوا بدري.",
    translationEn: "The children get up early.",
    explanationAr:
      "«aufstehen» منفصل: «stehen» في النص، و«auf» في الآخر.",
    explanationEn:
      "“aufstehen” separates: “stehen” stays in the middle and “auf” comes last.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A1",
    pattern: "separable-zumachen-prefix",
    before: "Bitte mach die Tür",
    after: ".",
    hintAr: "«zumachen» = يقفل. البادئة «zu» آخر الجملة.",
    hintEn: "“zumachen” means to close; “zu” ends the sentence.",
    options: ["zu", "auf", "an", "aus"],
    answer: "zu",
    translationAr: "لو سمحت اقفل الباب.",
    translationEn: "Please close the door.",
    explanationAr:
      "«zumachen» منفصل: «mach» في النص، و«zu» آخر الجملة.",
    explanationEn:
      "“zumachen” separates: “mach” stays in the middle and “zu” closes the sentence.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A2",
    pattern: "separable-abgeben-prefix",
    before: "Er gibt die Hausaufgaben morgen",
    after: ".",
    hintAr: "«abgeben» = يسلّم. البادئة «ab» بتروح الآخر.",
    hintEn: "“abgeben” means to hand in; “ab” moves to the end.",
    options: ["ab", "an", "auf", "aus"],
    answer: "ab",
    translationAr: "هو هيسلّم الواجب بكرة.",
    translationEn: "He hands in the homework tomorrow.",
    explanationAr:
      "«abgeben» منفصل: «gibt» تاني، و«ab» آخر الجملة.",
    explanationEn:
      "“abgeben” separates: “gibt” is second and “ab” goes to the end.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
  {
    level: "A1",
    pattern: "separable-anfangen-prefix",
    before: "Wir fangen jetzt mit dem Unterricht",
    after: ".",
    hintAr: "«anfangen» = يبدأ. البادئة «an» آخر الجملة.",
    hintEn: "“anfangen” means to begin; “an” ends the sentence.",
    options: ["an", "auf", "aus", "ein"],
    answer: "an",
    translationAr: "إحنا بنبدأ الدرس دلوقتي.",
    translationEn: "We begin the lesson now.",
    explanationAr:
      "«anfangen» منفصل: «fangen» في النص، و«an» آخر الجملة.",
    explanationEn:
      "“anfangen” separates: “fangen” stays in the middle and “an” comes last.",
    weakSpotAr: "الأفعال المنفصلة",
    weakSpotEn: "Separable verbs",
  },
];

const subordinateSeeds: Seed[] = [
  {
    level: "A2",
    pattern: "weil-verb-final",
    before: "Ich bleibe zu Hause,",
    after: ".",
    hintAr: "بعد «weil» الفعل المصرّف بيروح لآخر الجملة.",
    hintEn: "After “weil”, the conjugated verb moves to the end.",
    options: [
      "weil ich krank bin",
      "weil ich bin krank",
      "weil bin ich krank",
      "ich weil krank bin",
    ],
    answer: "weil ich krank bin",
    translationAr: "أنا قاعد في البيت لأني عيان.",
    translationEn: "I am staying at home because I am ill.",
    explanationAr:
      "«weil» أداة ربط لجملة فرعية، فالفعل «bin» بيروح آخر الجملة: weil ich krank bin.",
    explanationEn:
      "“weil” introduces a subordinate clause, so the verb “bin” moves to the end: weil ich krank bin.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "A2",
    pattern: "dass-verb-final",
    before: "Er sagt,",
    after: ".",
    hintAr: "«dass» بتخلي الفعل في الآخر.",
    hintEn: "“dass” sends the verb to the end.",
    options: [
      "dass er morgen kommt",
      "dass er kommt morgen",
      "dass morgen er kommt",
      "dass kommt er morgen",
    ],
    answer: "dass er morgen kommt",
    translationAr: "هو بيقول إنه جاي بكرة.",
    translationEn: "He says that he is coming tomorrow.",
    explanationAr:
      "بعد «dass» الفعل المصرّف «kommt» لازم يكون في آخر الجملة.",
    explanationEn:
      "After “dass”, the conjugated verb “kommt” must be at the end of the clause.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "A2",
    pattern: "wenn-verb-final",
    before: "",
    after: ", gehe ich spazieren.",
    hintAr: "«wenn» جملة فرعية، فالفعل في آخرها.",
    hintEn: "“wenn” starts a subordinate clause, so its verb goes last.",
    options: [
      "Wenn ich Zeit habe",
      "Wenn ich habe Zeit",
      "Wenn habe ich Zeit",
      "Ich wenn Zeit habe",
    ],
    answer: "Wenn ich Zeit habe",
    translationAr: "لو عندي وقت، بمشي شوية.",
    translationEn: "If I have time, I go for a walk.",
    explanationAr:
      "«wenn» + جملة فرعية، والفعل «habe» في آخرها قبل الفاصلة.",
    explanationEn:
      "“wenn” introduces a subordinate clause whose verb “habe” sits at the end, before the comma.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "A2",
    pattern: "weil-verb-final",
    before: "Sie lernt Deutsch,",
    after: ".",
    hintAr: "«weil» وبعدها فاعل ثم باقي الجملة ثم الفعل.",
    hintEn: "After “weil”: subject, then the rest, then the verb.",
    options: [
      "weil sie in Berlin arbeitet",
      "weil sie arbeitet in Berlin",
      "weil arbeitet sie in Berlin",
      "weil in Berlin sie arbeitet",
    ],
    answer: "weil sie in Berlin arbeitet",
    translationAr: "هي بتتعلم ألماني لأنها بتشتغل في برلين.",
    translationEn: "She is learning German because she works in Berlin.",
    explanationAr:
      "في الجملة الفرعية بعد «weil»: الفاعل «sie»، ثم «in Berlin»، والفعل «arbeitet» في الآخر.",
    explanationEn:
      "In the subordinate clause after “weil”: subject “sie”, then “in Berlin”, and the verb “arbeitet” last.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "A2",
    pattern: "ob-verb-final",
    before: "Ich weiß nicht,",
    after: ".",
    hintAr: "«ob» = إذا/هل. الفعل بيروح الآخر.",
    hintEn: "“ob” means whether; the verb moves to the end.",
    options: [
      "ob er heute kommt",
      "ob er kommt heute",
      "ob kommt er heute",
      "ob heute kommt er",
    ],
    answer: "ob er heute kommt",
    translationAr: "أنا مش عارف هو جاي النهارده ولا لأ.",
    translationEn: "I do not know whether he is coming today.",
    explanationAr:
      "«ob» بتعمل جملة فرعية، فالفعل «kommt» في آخرها.",
    explanationEn:
      "“ob” creates a subordinate clause, so the verb “kommt” goes to the end.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "B1",
    pattern: "bevor-verb-final",
    before: "Er ruft an,",
    after: ".",
    hintAr: "«bevor» = قبل ما. الفعل في آخر الجملة الفرعية.",
    hintEn: "“bevor” means before; its clause is verb-final.",
    options: [
      "bevor er nach Hause geht",
      "bevor er geht nach Hause",
      "bevor geht er nach Hause",
      "bevor nach Hause er geht",
    ],
    answer: "bevor er nach Hause geht",
    translationAr: "هو بيتصل قبل ما يروح البيت.",
    translationEn: "He calls before he goes home.",
    explanationAr:
      "«bevor» جملة فرعية: الفاعل «er»، ثم «nach Hause»، والفعل «geht» في الآخر.",
    explanationEn:
      "“bevor” starts a subordinate clause: subject “er”, then “nach Hause”, with the verb “geht” last.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "A2",
    pattern: "wenn-verb-final",
    before: "",
    after: ", gehen wir ins Kino.",
    hintAr: "جملة «wenn» الأولى لازم تنتهي بالفعل.",
    hintEn: "The “wenn” clause must end with its verb.",
    options: [
      "Wenn der Film gut ist",
      "Wenn der Film ist gut",
      "Wenn ist der Film gut",
      "Der Film wenn gut ist",
    ],
    answer: "Wenn der Film gut ist",
    translationAr: "لو الفيلم حلو، هنروح السينما.",
    translationEn: "If the film is good, we will go to the cinema.",
    explanationAr:
      "«wenn» + فاعل «der Film» + باقي الجملة + الفعل «ist» في الآخر.",
    explanationEn:
      "“wenn” + subject “der Film” + the rest + the verb “ist” at the end.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "A2",
    pattern: "weil-verb-final",
    before: "Sie bleibt im Bett,",
    after: ".",
    hintAr: "«weil» + فاعل + مفعول + فعل في الآخر.",
    hintEn: "“weil” + subject + object + verb at the end.",
    options: [
      "weil sie Fieber hat",
      "weil sie hat Fieber",
      "weil hat sie Fieber",
      "weil Fieber sie hat",
    ],
    answer: "weil sie Fieber hat",
    translationAr: "هي قعدت في السرير لأن عندها سخونية.",
    translationEn: "She stays in bed because she has a fever.",
    explanationAr:
      "بعد «weil»: «sie» فاعل، «Fieber» مفعول، والفعل «hat» في الآخر.",
    explanationEn:
      "After “weil”: “sie” is the subject, “Fieber” the object, and the verb “hat” comes last.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
  {
    level: "B1",
    pattern: "indirect-question-verb-final",
    before: "Ich möchte wissen,",
    after: ".",
    hintAr: "السؤال غير المباشر بياخد ترتيب الجملة الفرعية.",
    hintEn: "An indirect question uses subordinate-clause order.",
    options: [
      "wann der Zug ankommt",
      "wann der Zug kommt an",
      "wann kommt der Zug an",
      "wann der Zug an kommt",
    ],
    answer: "wann der Zug ankommt",
    translationAr: "عايز أعرف القطر بيوصل إمتى.",
    translationEn: "I would like to know when the train arrives.",
    explanationAr:
      "السؤال غير المباشر جملة فرعية: «wann» + فاعل + باقي الجملة + الفعل «ankommt» في الآخر.",
    explanationEn:
      "An indirect question is subordinate: “wann” + subject + the rest + the verb “ankommt” at the end.",
    weakSpotAr: "السؤال غير المباشر",
    weakSpotEn: "Indirect questions",
  },
  {
    level: "A2",
    pattern: "dass-verb-final",
    before: "Er hat gesagt,",
    after: ".",
    hintAr: "«dass» وبعدها الفعل في آخر الجملة.",
    hintEn: "“dass” sends the verb to the end of its clause.",
    options: [
      "dass er später kommt",
      "dass er kommt später",
      "dass später er kommt",
      "dass kommt er später",
    ],
    answer: "dass er später kommt",
    translationAr: "هو قال إنه جاي متأخر.",
    translationEn: "He said that he is coming later.",
    explanationAr:
      "بعد «dass»: الفاعل «er»، ثم «später»، والفعل «kommt» في الآخر.",
    explanationEn:
      "After “dass”: subject “er”, then “später”, with the verb “kommt” last.",
    weakSpotAr: "الفعل في آخر الجملة الفرعية",
    weakSpotEn: "Verb-final subordinate clause",
  },
];

const pluralSeeds: Seed[] = [
  {
    level: "A1",
    pattern: "plural-er",
    before: "Zwei",
    after: " spielen im Garten.",
    hintAr: "جمع «Kind» بياخد «er».",
    hintEn: "The plural of “Kind” adds “er”.",
    options: ["Kinder", "Kinds", "Kindern", "Kinde"],
    answer: "Kinder",
    translationAr: "طفلين بيلعبوا في الجنينة.",
    translationEn: "Two children are playing in the garden.",
    explanationAr:
      "«Kind» جمعها «Kinder» بزيادة «er». الألماني مش بيجمع بـ «s» زي الإنجليزي.",
    explanationEn:
      "“Kind” becomes “Kinder” with “er”. German plurals are not formed with “s” like English.",
    weakSpotAr: "صيغة الجمع",
    weakSpotEn: "Plural forms",
  },
  {
    level: "A1",
    pattern: "plural-umlaut-er",
    before: "Die",
    after: " sind neu.",
    hintAr: "«Buch» جمعها فيها umlaut و«er».",
    hintEn: "“Buch” takes an umlaut and “er” in the plural.",
    options: ["Bücher", "Buchs", "Büchern", "Buche"],
    answer: "Bücher",
    translationAr: "الكتب جديدة.",
    translationEn: "The books are new.",
    explanationAr:
      "«Buch» → «Bücher»: بيحصل umlaut (u → ü) وبنضيف «er».",
    explanationEn:
      "“Buch” becomes “Bücher”: the vowel takes an umlaut (u → ü) and “er” is added.",
    weakSpotAr: "الجمع مع umlaut",
    weakSpotEn: "Umlaut plurals",
  },
  {
    level: "A1",
    pattern: "plural-en",
    before: "Ich sehe drei",
    after: ".",
    hintAr: "جمع «Frau» بياخد «en».",
    hintEn: "The plural of “Frau” adds “en”.",
    options: ["Frauen", "Fraus", "Frauenen", "Fraue"],
    answer: "Frauen",
    translationAr: "أنا شايف تلات ستات.",
    translationEn: "I see three women.",
    explanationAr:
      "«Frau» → «Frauen» بزيادة «en». مفيش «s» في الآخر.",
    explanationEn:
      "“Frau” becomes “Frauen” with “en” — no final “s”.",
    weakSpotAr: "صيغة الجمع",
    weakSpotEn: "Plural forms",
  },
  {
    level: "A1",
    pattern: "plural-s",
    before: "Die",
    after: " fahren schnell.",
    hintAr: "«Auto» من الأسماء اللي جمعها بـ «s».",
    hintEn: "“Auto” is one of the nouns that takes “s” in the plural.",
    options: ["Autos", "Auten", "Autoe", "Autoes"],
    answer: "Autos",
    translationAr: "العربيات بتجري بسرعة.",
    translationEn: "The cars drive fast.",
    explanationAr:
      "«Auto» → «Autos». بعض الكلمات الأجنبية أو المختصرة بتاخد «s» في الجمع.",
    explanationEn:
      "“Auto” becomes “Autos”. Some loanwords and short words take “s” in the plural.",
    weakSpotAr: "الجمع بـ s",
    weakSpotEn: "Plurals with s",
  },
  {
    level: "A2",
    pattern: "plural-umlaut-e",
    before: "Wir besuchen zwei",
    after: ".",
    hintAr: "«Stadt» جمعها فيها umlaut و«e».",
    hintEn: "“Stadt” takes an umlaut and “e” in the plural.",
    options: ["Städte", "Stadts", "Städten", "Stadte"],
    answer: "Städte",
    translationAr: "إحنا بنزور مدينتين.",
    translationEn: "We visit two cities.",
    explanationAr:
      "«Stadt» → «Städte»: umlaut (a → ä) + «e».",
    explanationEn:
      "“Stadt” becomes “Städte”: umlaut (a → ä) plus “e”.",
    weakSpotAr: "الجمع مع umlaut",
    weakSpotEn: "Umlaut plurals",
  },
  {
    level: "A1",
    pattern: "plural-e",
    before: "Die",
    after: " schlafen.",
    hintAr: "جمع «Hund» بياخد «e».",
    hintEn: "The plural of “Hund” adds “e”.",
    options: ["Hunde", "Hunds", "Hunden", "Hundes"],
    answer: "Hunde",
    translationAr: "الكلاب نايمة.",
    translationEn: "The dogs are sleeping.",
    explanationAr:
      "«Hund» → «Hunde» بزيادة «e» فقط.",
    explanationEn:
      "“Hund” becomes “Hunde” with a simple “e” ending.",
    weakSpotAr: "صيغة الجمع",
    weakSpotEn: "Plural forms",
  },
  {
    level: "A1",
    pattern: "plural-e",
    before: "Sie kauft drei",
    after: ".",
    hintAr: "«Brot» جمعها «Brote».",
    hintEn: "“Brot” becomes “Brote”.",
    options: ["Brote", "Brots", "Broten", "Brotes"],
    answer: "Brote",
    translationAr: "هي بتشتري تلات أرغفة.",
    translationEn: "She buys three loaves.",
    explanationAr:
      "«Brot» → «Brote» بزيادة «e».",
    explanationEn:
      "“Brot” becomes “Brote” with an “e” ending.",
    weakSpotAr: "صيغة الجمع",
    weakSpotEn: "Plural forms",
  },
  {
    level: "A2",
    pattern: "plural-umlaut",
    before: "Die",
    after: " sind lecker.",
    hintAr: "«Apfel» جمعها بتاخد umlaut بس من غير نهاية زيادة.",
    hintEn: "“Apfel” only takes an umlaut in the plural.",
    options: ["Äpfel", "Apfels", "Äpfeln", "Apfel"],
    answer: "Äpfel",
    translationAr: "التفاح لذيذ.",
    translationEn: "The apples are delicious.",
    explanationAr:
      "«Apfel» → «Äpfel»: umlaut (a → ä) من غير إضافة نهاية.",
    explanationEn:
      "“Apfel” becomes “Äpfel” through the umlaut (a → ä) only, with no extra ending.",
    weakSpotAr: "الجمع مع umlaut",
    weakSpotEn: "Umlaut plurals",
  },
  {
    level: "A2",
    pattern: "dative-plural-n",
    before: "Wir helfen den",
    after: ".",
    hintAr: "في Dativ الجمع، الاسم بياخد «n» كمان.",
    hintEn: "In the dative plural, the noun also adds “n”.",
    options: ["Kindern", "Kinder", "Kinds", "Kindes"],
    answer: "Kindern",
    translationAr: "إحنا بنساعد الأطفال.",
    translationEn: "We help the children.",
    explanationAr:
      "«helfen» + Dativ. الجمع «Kinder» بياخد «n» إضافية في Dativ → «Kindern».",
    explanationEn:
      "“helfen” takes the dative. The plural “Kinder” adds “n” in the dative → “Kindern”.",
    weakSpotAr: "الجمع في Dativ",
    weakSpotEn: "Dative plural",
  },
  {
    level: "A1",
    pattern: "plural-en",
    before: "Die",
    after: " stehen im Regal.",
    hintAr: "جمع «Flasche» بياخد «n».",
    hintEn: "The plural of “Flasche” adds “n”.",
    options: ["Flaschen", "Flaschs", "Flaschenn", "Flasche"],
    answer: "Flaschen",
    translationAr: "الزجاجات واقفة على الرف.",
    translationEn: "The bottles stand on the shelf.",
    explanationAr:
      "«Flasche» → «Flaschen» بزيادة «n» لأن الكلمة أصلًا منتهية بـ «e».",
    explanationEn:
      "“Flasche” becomes “Flaschen” by adding “n”, because the noun already ends in “e”.",
    weakSpotAr: "صيغة الجمع",
    weakSpotEn: "Plural forms",
  },
];

/**
 * Deterministic bank used by the demo provider and as a partial fallback when
 * a live model returns fewer valid questions than requested. It intentionally
 * mirrors the seven practice topics and covers A1–B1.
 */
export const DRILL_FALLBACK_BANK: Record<DrillTopic, DrillBankItem[]> = {
  articles: articleSeeds.map(q),
  cases: caseSeeds.map(q),
  prepositions: prepositionSeeds.map(q),
  verb_position: verbPositionSeeds.map(q),
  separable_verbs: separableSeeds.map(q),
  subordinate_clauses: subordinateSeeds.map(q),
  plurals: pluralSeeds.map(q),
};

const levelRank: Record<DrillLevel, number> = { A1: 0, A2: 1, B1: 2 };

/**
 * Deterministic bank selection used by both the demo provider and the live
 * fallback path. Questions closest to the requested level come first, and
 * excluded stems are skipped so replacement/fill never duplicates a question.
 */
export function pickBankDrillQuestions(input: {
  topic: DrillTopic;
  level: DrillLevel;
  count: number;
  excludePrompts?: readonly string[];
}): DrillQuestionModel[] {
  const used = new Set(
    (input.excludePrompts ?? [])
      .map((prompt) => drillPromptKey(prompt, ""))
      .filter(Boolean),
  );
  const candidates = [...DRILL_FALLBACK_BANK[input.topic]].sort((a, b) => {
    return (
      Math.abs(levelRank[a.level] - levelRank[input.level]) -
      Math.abs(levelRank[b.level] - levelRank[input.level])
    );
  });

  const picked: DrillQuestionModel[] = [];
  for (const item of candidates) {
    if (picked.length >= input.count) break;
    const key = drillPromptKey(
      item.question.prompt_before,
      item.question.prompt_after,
    );
    if (used.has(key)) continue;
    used.add(key);
    picked.push(item.question);
  }
  return picked;
}
