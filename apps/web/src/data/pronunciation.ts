import type {
  CefrLevel,
  PronunciationPhrase,
  PronunciationSoundId,
  PronunciationSounds,
} from "@/types/domain";

/**
 * A small, honest approximation of German phonology. The app cannot inspect
 * formants in a browser, so it maps the sounds that Arabic speakers most often
 * struggle with to their graphemes and gives targeted feedback per sound.
 */
export const PRONUNCIATION_SOUNDS: Record<
  PronunciationSoundId,
  PronunciationSounds
> = {
  ch: {
    id: "ch",
    symbol: "/ç/ · /x/",
    labelAr: "صوت ch",
    labelEn: "The ch sound",
    tipAr:
      "بعد i أو e يكون ناعمًا مثل هاء مهموسة، وبعد a/o/u خشنًا من الحلق. مش صوت k.",
    tipEn:
      "After i/e it is a soft breathy sound; after a/o/u it comes from the throat. It is never a k.",
  },
  sch: {
    id: "sch",
    symbol: "/ʃ/",
    labelAr: "صوت sch",
    labelEn: "The sch sound",
    tipAr: "زي الشين في العربي، لكن الشفايف مستديرة شوية.",
    tipEn: "Like English sh, with slightly rounded lips.",
  },
  ue: {
    id: "ue",
    symbol: "/yː/",
    labelAr: "صوت ü",
    labelEn: "The ü sound",
    tipAr: "ضم شفايفك كأنك بتقول u، وفي نفس الوقت قول i.",
    tipEn: "Round your lips as for u while saying i.",
  },
  oe: {
    id: "oe",
    symbol: "/øː/",
    labelAr: "صوت ö",
    labelEn: "The ö sound",
    tipAr: "ضم الشفايف كأنك بتقول o، وقول e في نفس الوقت.",
    tipEn: "Round your lips as for o while saying e.",
  },
  ae: {
    id: "ae",
    symbol: "/ɛː/",
    labelAr: "صوت ä",
    labelEn: "The ä sound",
    tipAr: "زي الفتحة الطويلة في «ليه» من غير ياء.",
    tipEn: "Like a long e in bed, held a little longer.",
  },
  r: {
    id: "r",
    symbol: "/ʁ/",
    labelAr: "صوت r",
    labelEn: "The German r",
    tipAr: "من الحلق بخفة، ومش راء عربية مكررة. في آخر الكلمة بيخف جدًا.",
    tipEn: "A soft throat sound, not a rolled Arabic r. It weakens at the end of words.",
  },
  w: {
    id: "w",
    symbol: "/v/",
    labelAr: "حرف w",
    labelEn: "The letter w",
    tipAr: "w في الألمانية = ڤ، مش و. Weber تنطق ڤيبر.",
    tipEn: "German w is English v. Weber starts with a v sound.",
  },
  v: {
    id: "v",
    symbol: "/f/",
    labelAr: "حرف v",
    labelEn: "The letter v",
    tipAr: "v في أغلب الكلمات الألمانية = ف، زي viel = فيل.",
    tipEn: "German v is usually an f sound, as in viel.",
  },
  z: {
    id: "z",
    symbol: "/ts/",
    labelAr: "حرف z",
    labelEn: "The letter z",
    tipAr: "z = تس، زي Zeit = تسايت. مش زاي.",
    tipEn: "German z is ts, as in Zeit. It is never a buzzing z.",
  },
  ei: {
    id: "ei",
    symbol: "/aɪ/",
    labelAr: "المقطع ei",
    labelEn: "The ei digraph",
    tipAr: "زي «آي» في ماي، مش إي.",
    tipEn: "Like the English eye sound, not a long e.",
  },
  ie: {
    id: "ie",
    symbol: "/iː/",
    labelAr: "المقطع ie",
    labelEn: "The ie digraph",
    tipAr: "زي الياء الممدودة «إي»، عكس ei.",
    tipEn: "A long ee sound, the opposite of ei.",
  },
  eu: {
    id: "eu",
    symbol: "/ɔʏ/",
    labelAr: "المقطع eu",
    labelEn: "The eu digraph",
    tipAr: "زي «أوي» في أوي، مع شفايف مستديرة.",
    tipEn: "Like oy in boy, with rounded lips.",
  },
  sp_st: {
    id: "sp_st",
    symbol: "/ʃp/ · /ʃt/",
    labelAr: "sp وst في أول الكلمة",
    labelEn: "Initial sp and st",
    tipAr: "لو الكلمة تبدأ بـ sp أو st، الـ s تتنطق ش: sprechen = شبرشِن.",
    tipEn: "At the start of a word, sp/st are pronounced shp/sht.",
  },
  final_er: {
    id: "final_er",
    symbol: "/ɐ/",
    labelAr: "آخر الكلمة -er",
    labelEn: "Final -er",
    tipAr: "في آخر الكلمة بتخف لصوت قريب من «أ»، مش «إر» واضحة.",
    tipEn: "At the end of a word it relaxes into a soft a, not a full er.",
  },
};

interface PhraseSeed {
  id: string;
  level: CefrLevel;
  textDe: string;
  translationAr: string;
  translationEn: string;
  tipAr: string;
  tipEn: string;
  focus: PronunciationSoundId[];
}

const PHRASE_SEEDS: PhraseSeed[] = [
  {
    id: "a1-introduce",
    level: "A1",
    textDe: "Ich möchte mich vorstellen.",
    translationAr: "عايز أعرّف بنفسي.",
    translationEn: "I would like to introduce myself.",
    tipAr: "ركّز على ch في Ich وmöchte ومich.",
    tipEn: "Focus on the ch in Ich, möchte, and mich.",
    focus: ["ch", "oe"],
  },
  {
    id: "a1-tired",
    level: "A1",
    textDe: "Ich fühle mich heute müde.",
    translationAr: "حاسس إني تعبان النهارده.",
    translationEn: "I feel tired today.",
    tipAr: "ü في fühle وmüde محتاج ضم الشفايف مع إي.",
    tipEn: "The ü in fühle and müde needs rounded lips plus ee.",
    focus: ["ue", "ch"],
  },
  {
    id: "a1-wo",
    level: "A1",
    textDe: "Wo wohnt die Frau Weber?",
    translationAr: "السيدة ڤيبر ساكنة فين؟",
    translationEn: "Where does Mrs Weber live?",
    tipAr: "كل w هنا تتنطق ڤ، مش و.",
    tipEn: "Every w here is a v sound, not a w.",
    focus: ["w", "r"],
  },
  {
    id: "a1-two-rooms",
    level: "A1",
    textDe: "Zwei Zimmer, bitte.",
    translationAr: "أوضتين، لو سمحت.",
    translationEn: "Two rooms, please.",
    tipAr: "z = تس في Zwei وZimmer.",
    tipEn: "z is ts in both Zwei and Zimmer.",
    focus: ["z"],
  },
  {
    id: "a1-shoe",
    level: "A1",
    textDe: "Der Schuh ist schön.",
    translationAr: "الجزمة حلوة.",
    translationEn: "The shoe is beautiful.",
    tipAr: "sch = ش، وö محتاج شفايف مستديرة.",
    tipEn: "sch is sh, and ö needs rounded lips.",
    focus: ["sch", "oe"],
  },
  {
    id: "a1-brother",
    level: "A1",
    textDe: "Mein Bruder bleibt heute zu Hause.",
    translationAr: "أخويا قاعد في البيت النهارده.",
    translationEn: "My brother is staying home today.",
    tipAr: "ei في Mein وbleibt = آي.",
    tipEn: "ei in Mein and bleibt is the eye sound.",
    focus: ["ei"],
  },
  {
    id: "a2-piano",
    level: "A2",
    textDe: "Wir spielen jeden Abend eine Stunde Klavier.",
    translationAr: "بنعزف كل يوم ساعة على البيانو.",
    translationEn: "We play the piano for an hour every evening.",
    tipAr: "sp في spielen = شپ، وie في spielen وKlavier = إي طويلة.",
    tipEn: "sp in spielen is shp, and ie is a long ee.",
    focus: ["sp_st", "ie"],
  },
  {
    id: "a2-exam",
    level: "A2",
    textDe: "Für die Prüfung brauche ich genügend Zeit.",
    translationAr: "للإمتحان محتاج وقت كفاية.",
    translationEn: "I need enough time for the exam.",
    tipAr: "ü في Für وPrüfung وgenügend، وch في ich وbrauche.",
    tipEn: "ü appears in Für, Prüfung, and genügend; ch in ich and brauche.",
    focus: ["ue", "ch", "z"],
  },
  {
    id: "a2-teacher",
    level: "A2",
    textDe: "Der Lehrer erklärt die Regel noch einmal.",
    translationAr: "المدرس بيشرح القاعدة تاني.",
    translationEn: "The teacher explains the rule once more.",
    tipAr: "r في Lehrer وRegel من الحلق، و-er في الآخر خفيفة.",
    tipEn: "The r in Lehrer and Regel is throaty, and final -er is soft.",
    focus: ["r", "final_er", "ae"],
  },
  {
    id: "a2-business-card",
    level: "A2",
    textDe: "Vielen Dank für die Visitenkarte.",
    translationAr: "شكرًا جزيلًا على كارت العمل.",
    translationEn: "Many thanks for the business card.",
    tipAr: "v في Vielen وVisitenkarte = ف.",
    tipEn: "v in Vielen and Visitenkarte is an f sound.",
    focus: ["v", "ue", "r"],
  },
  {
    id: "a2-email",
    level: "A2",
    textDe: "Ich bleibe heute zu Hause und schreibe eine E-Mail.",
    translationAr: "هقعد في البيت النهارده وهكتب إيميل.",
    translationEn: "I am staying home today and writing an email.",
    tipAr: "ei في bleibe وheute وschreibe وeine = آي.",
    tipEn: "ei in bleibe, heute, schreibe, and eine is the eye sound.",
    focus: ["ei", "sch"],
  },
  {
    id: "a2-beach",
    level: "A2",
    textDe: "Später sprechen wir über den Strand.",
    translationAr: "بعدين هنتكلم عن الشاطئ.",
    translationEn: "Later we will talk about the beach.",
    tipAr: "sp في Später وsprechen وst في Strand = شپ/شت.",
    tipEn: "sp in Später/sprechen and st in Strand are shp/sht.",
    focus: ["sp_st", "ue", "ch"],
  },
  {
    id: "b1-people",
    level: "B1",
    textDe: "Die Leute freuen sich über die neue Brücke.",
    translationAr: "الناس مبسوطين بالكوبري الجديد.",
    translationEn: "The people are happy about the new bridge.",
    tipAr: "eu في Leute وfreuen وneue = أوي، وü في Brücke.",
    tipEn: "eu in Leute, freuen, and neue is oy; ü in Brücke.",
    focus: ["eu", "ue", "ch"],
  },
  {
    id: "b1-teacher-corrects",
    level: "B1",
    textDe: "Der Lehrer korrigiert den Text gründlich.",
    translationAr: "المدرس بيصحح النص بعناية.",
    translationEn: "The teacher corrects the text thoroughly.",
    tipAr: "r متكرر، وü في gründlich، و-er في Lehrer.",
    tipEn: "Lots of r, ü in gründlich, and final -er in Lehrer.",
    focus: ["r", "ue", "final_er"],
  },
  {
    id: "b1-speak-clearly",
    level: "B1",
    textDe: "Ich spreche sicher, obwohl ich noch übe.",
    translationAr: "بتكلم بثقة، رغم إني لسه بتدرب.",
    translationEn: "I speak confidently, although I am still practising.",
    tipAr: "ch في Ich وspreche وsicher وobwohl، وsp في sprechen.",
    tipEn: "ch in Ich, spreche, sicher, obwohl; sp in sprechen.",
    focus: ["ch", "sp_st", "ue"],
  },
  {
    id: "b1-greetings",
    level: "B1",
    textDe: "Schöne Grüße aus München!",
    translationAr: "تحياتي من ميونخ!",
    translationEn: "Warm greetings from Munich!",
    tipAr: "sch في Schöne، وö في Schöne، وü في Grüße وMünchen.",
    tipEn: "sch and ö in Schöne; ü in Grüße and München.",
    focus: ["sch", "oe", "ue"],
  },
  {
    id: "b1-time-to-act",
    level: "B1",
    textDe: "Zeit zu handeln, bevor der Zug abfährt.",
    translationAr: "وقت التصرف، قبل ما القطر يمشي.",
    translationEn: "Time to act before the train leaves.",
    tipAr: "z في Zeit وzu وZug = تس، وr في bevor وder.",
    tipEn: "z in Zeit, zu, Zug is ts; r in bevor and der.",
    focus: ["z", "r", "ae"],
  },
  {
    id: "b1-understand",
    level: "B1",
    textDe: "Wir verstehen viel, aber wir müssen noch viel üben.",
    translationAr: "بنفهم كتير، لكن لازم نتدرب أكتر.",
    translationEn: "We understand a lot, but we still need to practise a lot.",
    tipAr: "v في verstehen وviel = ف، وü في müssen وüben.",
    tipEn: "v in verstehen and viel is f; ü in müssen and üben.",
    focus: ["v", "ue", "r"],
  },
];

export const PRONUNCIATION_PHRASES: PronunciationPhrase[] =
  PHRASE_SEEDS.map((seed) => ({ ...seed }));

export function pronunciationPhrasesForLevel(
  level: CefrLevel,
): PronunciationPhrase[] {
  return PRONUNCIATION_PHRASES.filter((phrase) => phrase.level === level);
}

export function findPronunciationPhrase(
  id: string,
): PronunciationPhrase | undefined {
  return PRONUNCIATION_PHRASES.find((phrase) => phrase.id === id);
}
