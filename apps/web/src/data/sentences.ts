import type {
  CefrLevel,
  SentenceExercise,
  SentenceToken,
} from "@/types/domain";

const roleLabels: Record<
  SentenceToken["role"],
  { labelAr: string; labelEn: string }
> = {
  subject: { labelAr: "الفاعل", labelEn: "Subject" },
  verb: { labelAr: "الفعل", labelEn: "Verb" },
  verb_end: { labelAr: "الفعل في الآخر", labelEn: "Final verb" },
  object: { labelAr: "المفعول", labelEn: "Object" },
  time: { labelAr: "الزمن", labelEn: "Time" },
  place: { labelAr: "المكان", labelEn: "Place" },
  conjunction: { labelAr: "أداة ربط", labelEn: "Connector" },
  particle: { labelAr: "جزء منفصل", labelEn: "Separable part" },
  adjective: { labelAr: "صفة", labelEn: "Adjective" },
  other: { labelAr: "تفصيلة", labelEn: "Other" },
};

interface TokenSeed {
  text: string;
  role: SentenceToken["role"];
}

function makeSentence(input: {
  id: string;
  level: CefrLevel;
  kind: SentenceExercise["kind"];
  promptAr: string;
  promptEn: string;
  translationAr: string;
  translationEn: string;
  tokens: TokenSeed[];
  explanationAr: string;
  explanationEn: string;
}): SentenceExercise {
  const tokens: SentenceToken[] = input.tokens.map((token, index) => ({
    id: `${input.id}-t${index + 1}`,
    text: token.text,
    role: token.role,
  }));

  const uniqueRoles = [...new Set(tokens.map((token) => token.role))];

  return {
    id: input.id,
    level: input.level,
    kind: input.kind,
    promptAr: input.promptAr,
    promptEn: input.promptEn,
    translationAr: input.translationAr,
    translationEn: input.translationEn,
    tokens,
    correctOrder: tokens.map((token) => token.id),
    explanationAr: input.explanationAr,
    explanationEn: input.explanationEn,
    structureLabels: uniqueRoles.map((role) => ({
      role,
      labelAr: roleLabels[role].labelAr,
      labelEn: roleLabels[role].labelEn,
    })),
  };
}

/**
 * Correct token order is the order written here. The UI shuffles the bank and
 * compares by stable token id, so duplicate-looking words stay unambiguous.
 */
export const SENTENCE_EXERCISES: SentenceExercise[] = [
  makeSentence({
    id: "sentence-01",
    level: "A1",
    kind: "verb-second",
    promptAr: "ابدأ بـ Heute ورتّب الجملة.",
    promptEn: "Start with Heute and put the sentence in order.",
    translationAr: "النهارده أنا رايح السينما.",
    translationEn: "Today I am going to the cinema.",
    tokens: [
      { text: "Heute", role: "time" },
      { text: "gehe", role: "verb" },
      { text: "ich", role: "subject" },
      { text: "ins", role: "other" },
      { text: "Kino.", role: "place" },
    ],
    explanationAr:
      "بدأنا بالزمن «Heute»، فالفعل «gehe» لازم ييجي تاني، وبعده الفاعل «ich». ده هو الفعل التاني.",
    explanationEn:
      "The time word begins the sentence, so the verb must stay in position two, followed by the subject.",
  }),
  makeSentence({
    id: "sentence-02",
    level: "A1",
    kind: "separable",
    promptAr: "صحّي الجملة. افتكر إن الفعل المنفصل بيتقسم.",
    promptEn: "Build the sentence. Remember that separable verbs split.",
    translationAr: "أنا بصحى الساعة سبعة.",
    translationEn: "I get up at seven o'clock.",
    tokens: [
      { text: "Ich", role: "subject" },
      { text: "stehe", role: "verb" },
      { text: "um", role: "time" },
      { text: "sieben", role: "time" },
      { text: "Uhr", role: "time" },
      { text: "auf.", role: "particle" },
    ],
    explanationAr:
      "«aufstehen» فعل منفصل. الجزء الأساسي «stehe» في المكان التاني، والبادئة «auf» بتتطرد لآخر الجملة.",
    explanationEn:
      "“aufstehen” is separable. The main verb “stehe” is in position two and the prefix “auf” moves to the end.",
  }),
  makeSentence({
    id: "sentence-03",
    level: "A2",
    kind: "verb-final",
    promptAr: "صل الجملتين باستخدام weil.",
    promptEn: "Connect the clauses using weil.",
    translationAr: "أنا قاعد في البيت النهارده عشان أنا مريض.",
    translationEn: "I am staying at home today because I am ill.",
    tokens: [
      { text: "Ich", role: "subject" },
      { text: "bleibe", role: "verb" },
      { text: "heute", role: "time" },
      { text: "zu", role: "other" },
      { text: "Hause,", role: "place" },
      { text: "weil", role: "conjunction" },
      { text: "ich", role: "subject" },
      { text: "krank", role: "adjective" },
      { text: "bin.", role: "verb_end" },
    ],
    explanationAr:
      "«weil» بتفتح جملة فرعية، وبعدها الفعل «bin» بيروح لآخر الجملة. العربي بيربّط بـ«عشان» من غير ما يحرّك الفعل.",
    explanationEn:
      "“weil” starts a subordinate clause, and the conjugated verb moves to the very end.",
  }),
  makeSentence({
    id: "sentence-04",
    level: "A1",
    kind: "question",
    promptAr: "كوّن سؤالًا مؤدبًا.",
    promptEn: "Build a polite question.",
    translationAr: "ممكن تساعدني من فضلك؟",
    translationEn: "Can you please help me?",
    tokens: [
      { text: "Kannst", role: "verb" },
      { text: "du", role: "subject" },
      { text: "mir", role: "object" },
      { text: "bitte", role: "other" },
      { text: "helfen?", role: "verb_end" },
    ],
    explanationAr:
      "في السؤال اللي بيبدأ بفعل، الفعل «Kannst» بياخد المكان الأول، وبعده الفاعل. الفعل التاني «helfen» بيروح للآخر.",
    explanationEn:
      "In a yes/no question, the conjugated verb starts the sentence, then the subject; the infinitive goes at the end.",
  }),
  makeSentence({
    id: "sentence-05",
    level: "A2",
    kind: "verb-final",
    promptAr: "رتّب جملة الطلب بلطف.",
    promptEn: "Build the polite ordering sentence.",
    translationAr: "عايز أطلب قهوة.",
    translationEn: "I would like to order a coffee.",
    tokens: [
      { text: "Ich", role: "subject" },
      { text: "möchte", role: "verb" },
      { text: "einen", role: "object" },
      { text: "Kaffee", role: "object" },
      { text: "bestellen.", role: "verb_end" },
    ],
    explanationAr:
      "«möchte» في المكان التاني، والفعل الأساسي «bestellen» بيروح لآخر الجملة لأن عنده فعل مساعد.",
    explanationEn:
      "The modal verb “möchte” is in position two and the main infinitive “bestellen” goes to the end.",
  }),
  makeSentence({
    id: "sentence-06",
    level: "A2",
    kind: "verb-second",
    promptAr: "ابدأ بـ Am Wochenende.",
    promptEn: "Start with Am Wochenende.",
    translationAr: "في الويك إند أنا بروح برلين.",
    translationEn: "At the weekend I am going to Berlin.",
    tokens: [
      { text: "Am", role: "time" },
      { text: "Wochenende", role: "time" },
      { text: "fahre", role: "verb" },
      { text: "ich", role: "subject" },
      { text: "nach", role: "place" },
      { text: "Berlin.", role: "place" },
    ],
    explanationAr:
      "التعبير الزمني «Am Wochenende» في الأول، فالفعل «fahre» لازم ييجي تاني مباشرة. متحطّش «ich» قبل الفعل.",
    explanationEn:
      "When the time expression comes first, the verb must immediately follow it in position two.",
  }),
  makeSentence({
    id: "sentence-07",
    level: "A2",
    kind: "separable",
    promptAr: "رتّب مع مراعاة الفعل المنفصل anrufen.",
    promptEn: "Order the sentence, paying attention to separable “anrufen”.",
    translationAr: "هي بتتصل بأمها كل يوم.",
    translationEn: "She calls her mother every day.",
    tokens: [
      { text: "Sie", role: "subject" },
      { text: "ruft", role: "verb" },
      { text: "ihre", role: "object" },
      { text: "Mutter", role: "object" },
      { text: "jeden", role: "time" },
      { text: "Tag", role: "time" },
      { text: "an.", role: "particle" },
    ],
    explanationAr:
      "«anrufen» بينفصل: «ruft» في المكان التاني، والبادئة «an» بتروح لآخر الجملة. زي ما بتفصل الفعل المركب بالعربي في بعض اللهجات.",
    explanationEn:
      "The separable prefix “an” detaches from “ruft” and goes to the end.",
  }),
  makeSentence({
    id: "sentence-08",
    level: "A2",
    kind: "verb-final",
    promptAr: "كمّل الجملة بـ ob.",
    promptEn: "Build the sentence with “ob”.",
    translationAr: "أنا مش عارف هو هييجي بكرة ولا لأ.",
    translationEn: "I don't know whether he is coming tomorrow.",
    tokens: [
      { text: "Ich", role: "subject" },
      { text: "weiß", role: "verb" },
      { text: "nicht,", role: "other" },
      { text: "ob", role: "conjunction" },
      { text: "er", role: "subject" },
      { text: "morgen", role: "time" },
      { text: "kommt.", role: "verb_end" },
    ],
    explanationAr:
      "«ob» معناها «هل/ولا لأ» وبتبدأ جملة فرعية، فالفعل «kommt» بيروح لآخرها.",
    explanationEn:
      "“ob” introduces a subordinate clause, so the conjugated verb “kommt” goes to the end.",
  }),
  makeSentence({
    id: "sentence-09",
    level: "A2",
    kind: "verb-final",
    promptAr: "رتّب الجملة التي تبدأ بـ Wenn.",
    promptEn: "Order the sentence that starts with Wenn.",
    translationAr: "لو عندي وقت، بروح أعوم.",
    translationEn: "If I have time, I go swimming.",
    tokens: [
      { text: "Wenn", role: "conjunction" },
      { text: "ich", role: "subject" },
      { text: "Zeit", role: "object" },
      { text: "habe,", role: "verb_end" },
      { text: "gehe", role: "verb" },
      { text: "ich", role: "subject" },
      { text: "schwimmen.", role: "verb_end" },
    ],
    explanationAr:
      "بعد «Wenn» الفعل «habe» بيروح لآخر الجملة الفرعية. بعد الفاصلة، الجملة الأساسية بتبدأ بالفعل «gehe» لأن الجملة الفرعية واخدة المكان الأول.",
    explanationEn:
      "The subordinate verb “habe” goes to the end. After the comma, the main clause begins with its verb because the subordinate clause occupies position one.",
  }),
  makeSentence({
    id: "sentence-10",
    level: "A2",
    kind: "verb-second",
    promptAr: "ابدأ بـ Gestern واستخدم Perfekt.",
    promptEn: "Start with Gestern and use the perfect tense.",
    translationAr: "أمس أنا شفت فيلم.",
    translationEn: "Yesterday I watched a film.",
    tokens: [
      { text: "Gestern", role: "time" },
      { text: "habe", role: "verb" },
      { text: "ich", role: "subject" },
      { text: "einen", role: "object" },
      { text: "Film", role: "object" },
      { text: "gesehen.", role: "verb_end" },
    ],
    explanationAr:
      "في Perfekt، الفعل المساعد «habe» هو اللي بياخد المكان التاني، والـ Partizip «gesehen» بيروح لآخر الجملة. الفعل التاني لسه محفوظ.",
    explanationEn:
      "In the perfect tense, the auxiliary “habe” is in position two, while the participle “gesehen” goes to the end.",
  }),
  makeSentence({
    id: "sentence-11",
    level: "B1",
    kind: "separable",
    promptAr: "رتّب الجملة مع zu + المصدر.",
    promptEn: "Order the sentence with “zu” + infinitive.",
    translationAr: "أنا نسيت أقفل الشباك.",
    translationEn: "I forgot to close the window.",
    tokens: [
      { text: "Ich", role: "subject" },
      { text: "habe", role: "verb" },
      { text: "vergessen,", role: "verb_end" },
      { text: "das", role: "object" },
      { text: "Fenster", role: "object" },
      { text: "zu", role: "particle" },
      { text: "schließen.", role: "verb_end" },
    ],
    explanationAr:
      "في «vergessen + zu» الفعل «zu schließen» بيروح لآخر الجملة، و«zu» بتقف قبل المصدر. العربي بيقول «نسيت أقفل» من غير أداة زيادة.",
    explanationEn:
      "With “vergessen”, the construction “zu + infinitive” goes at the end of the sentence.",
  }),
  makeSentence({
    id: "sentence-12",
    level: "B1",
    kind: "verb-final",
    promptAr: "رتّب الجملة بجملة relative.",
    promptEn: "Order the sentence with a relative clause.",
    translationAr: "الراجل اللي قابلته أمس بيشتغل هنا.",
    translationEn: "The man whom I met yesterday works here.",
    tokens: [
      { text: "Der", role: "subject" },
      { text: "Mann,", role: "subject" },
      { text: "den", role: "object" },
      { text: "ich", role: "subject" },
      { text: "gestern", role: "time" },
      { text: "getroffen", role: "verb_end" },
      { text: "habe,", role: "verb_end" },
      { text: "arbeitet", role: "verb" },
      { text: "hier.", role: "place" },
    ],
    explanationAr:
      "الجملة الفرعية «den ich gestern getroffen habe» الفعل المساعد فيها في الآخر. بعدها الجملة الأساسية بتكمل، والفعل «arbeitet» في المكان التاني من الجزء الأساسي.",
    explanationEn:
      "The relative clause sends its conjugated verb “habe” to the end; the main clause then continues with “arbeitet”.",
  }),
  makeSentence({
    id: "sentence-13",
    level: "A1",
    kind: "question",
    promptAr: "كوّن سؤالًا يبدأ بـ Wo.",
    promptEn: "Build a question starting with Wo.",
    translationAr: "ساكن فين دلوقتي؟",
    translationEn: "Where do you live now?",
    tokens: [
      { text: "Wo", role: "other" },
      { text: "wohnst", role: "verb" },
      { text: "du", role: "subject" },
      { text: "jetzt?", role: "time" },
    ],
    explanationAr:
      "في سؤال الـ W، أداة السؤال في الأول، والفعل «wohnst» في المكان التاني، وبعده الفاعل «du».",
    explanationEn:
      "In a W-question, the question word is first and the verb stays in position two before the subject.",
  }),
  makeSentence({
    id: "sentence-14",
    level: "B1",
    kind: "separable",
    promptAr: "رتّب جملة مع الفعل المنفصل absagen وفعل مساعد.",
    promptEn: "Order the sentence with separable “absagen” and a modal verb.",
    translationAr: "لازم نأجّل الموعد بكرة.",
    translationEn: "We have to cancel the appointment tomorrow.",
    tokens: [
      { text: "Wir", role: "subject" },
      { text: "müssen", role: "verb" },
      { text: "den", role: "object" },
      { text: "Termin", role: "object" },
      { text: "morgen", role: "time" },
      { text: "absagen.", role: "verb_end" },
    ],
    explanationAr:
      "مع الفعل المساعد «müssen»، الفعل المنفصل بيفضل كامل في آخر الجملة: absagen. الانفصال بيحصل لما الفعل يكون أساسي لوحده، مش بعد الفعل المساعد.",
    explanationEn:
      "With a modal verb, the separable infinitive stays together at the end: “absagen”.",
  }),
  makeSentence({
    id: "sentence-15",
    level: "A1",
    kind: "general",
    promptAr: "كوّن جملة بسيطة عن أختك.",
    promptEn: "Build a simple sentence about your sister.",
    translationAr: "أختي بتحب تشرب شاي.",
    translationEn: "My sister likes drinking tea.",
    tokens: [
      { text: "Meine", role: "subject" },
      { text: "Schwester", role: "subject" },
      { text: "trinkt", role: "verb" },
      { text: "gern", role: "other" },
      { text: "Tee.", role: "object" },
    ],
    explanationAr:
      "جملة بسيطة: الفاعل، ثم الفعل في المكان التاني، وبعده التفاصيل. الألماني بيحب ترتيب واضح، مش زي مرونة ترتيب الجملة في العربي.",
    explanationEn:
      "A simple main clause: subject first, conjugated verb in position two, then the rest of the information.",
  }),
  makeSentence({
    id: "sentence-16",
    level: "B1",
    kind: "verb-final",
    promptAr: "ابدأ بـ Obwohl ولاحظ مكان الفعل.",
    promptEn: "Start with Obwohl and watch the verb position.",
    translationAr: "رغم إن الدنيا بتمطر، هي بتروح تتمشى.",
    translationEn: "Although it is raining, she goes for a walk.",
    tokens: [
      { text: "Obwohl", role: "conjunction" },
      { text: "es", role: "subject" },
      { text: "regnet,", role: "verb_end" },
      { text: "geht", role: "verb" },
      { text: "sie", role: "subject" },
      { text: "spazieren.", role: "verb_end" },
    ],
    explanationAr:
      "«Obwohl» جملة فرعية، فالفعل «regnet» في آخرها. بعد الفاصلة الجملة الأساسية بتبدأ بالفعل «geht» لأن الجزء الأول كله واخد المكان الأول.",
    explanationEn:
      "“Obwohl” starts a subordinate clause with the verb at the end. Its main clause then begins with “geht”.",
  }),
];
