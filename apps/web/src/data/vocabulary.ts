import type {
  GrammarArticle,
  StarterVocabCard,
  VocabularyCategory,
} from "@/types/domain";

const slugMap: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
};

function slug(word: string): string {
  return word
    .toLowerCase()
    .replace(/[äöüß]/g, (character) => slugMap[character] ?? character)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function seed(
  category: VocabularyCategory,
  word: string,
  article: GrammarArticle,
  plural: string | null,
  translationAr: string,
  translationEn: string,
  exampleDe: string,
  exampleAr: string,
): StarterVocabCard {
  return {
    id: `v-${slug(word)}`,
    word,
    article,
    plural,
    translationAr,
    translationEn,
    exampleDe,
    exampleAr,
    level: "A1",
    category,
  };
}

/**
 * 100 curated A1 nouns. Every noun carries its gender, plural and an example
 * sentence. Uncountable nouns intentionally use null; the UI always shows a
 * plural slot and falls back to "—" rather than inventing a plural.
 */
export const STARTER_VOCAB: StarterVocabCard[] = [
  // ── Home & everyday objects ───────────────────────────────────────
  seed("home", "Tisch", "der", "die Tische", "طاولة", "table", "Der Tisch ist groß.", "الطاولة كبيرة."),
  seed("home", "Stuhl", "der", "die Stühle", "كرسي", "chair", "Der Stuhl steht am Fenster.", "الكرسي واقف جانب الشباك."),
  seed("home", "Tür", "die", "die Türen", "باب", "door", "Die Tür ist offen.", "الباب مفتوح."),
  seed("home", "Fenster", "das", "die Fenster", "شباك", "window", "Das Fenster ist sauber.", "الشباك نضيف."),
  seed("home", "Bett", "das", "die Betten", "سرير", "bed", "Das Bett ist bequem.", "السرير مريح."),
  seed("home", "Zimmer", "das", "die Zimmer", "أوضة", "room", "Mein Zimmer ist klein.", "أوضتي صغيرة."),
  seed("home", "Küche", "die", "die Küchen", "مطبخ", "kitchen", "Die Küche ist hell.", "المطبخ منوّر."),
  seed("home", "Schlüssel", "der", "die Schlüssel", "مفتاح", "key", "Wo ist mein Schlüssel?", "فين مفتاحي؟"),
  seed("home", "Tasche", "die", "die Taschen", "شنطة", "bag", "Die Tasche ist schwer.", "الشنطة تقيلة."),
  seed("home", "Telefon", "das", "die Telefone", "تليفون", "telephone", "Mein Telefon ist neu.", "تليفوني جديد."),
  seed("home", "Buch", "das", "die Bücher", "كتاب", "book", "Ich lese ein Buch.", "أنا بقرأ كتاب."),
  seed("home", "Zeitung", "die", "die Zeitungen", "جريدة", "newspaper", "Er kauft eine Zeitung.", "هو بيشتري جريدة."),
  seed("home", "Uhr", "die", "die Uhren", "ساعة", "clock / watch", "Die Uhr ist kaputt.", "الساعة بايظة."),
  seed("home", "Lampe", "die", "die Lampen", "لمبة", "lamp", "Die Lampe ist an.", "اللمبة شغّالة."),
  seed("home", "Garten", "der", "die Gärten", "جنينة", "garden", "Wir haben einen Garten.", "عندنا جنينة."),
  seed("home", "Haus", "das", "die Häuser", "بيت", "house", "Das Haus ist alt.", "البيت قديم."),
  seed("home", "Wohnung", "die", "die Wohnungen", "شقة", "flat / apartment", "Die Wohnung ist frei.", "الشقة فاضية."),
  seed("home", "Bad", "das", "die Bäder", "حمام", "bathroom", "Das Bad ist klein.", "الحمام صغير."),
  seed("home", "Sofa", "das", "die Sofas", "كنبة", "sofa", "Das Sofa ist grau.", "الكنبة رمادي."),
  seed("home", "Schrank", "der", "die Schränke", "دولاب", "wardrobe / cupboard", "Der Schrank ist voll.", "الدولاب مليان."),

  // ── People & family ──────────────────────────────────────────────
  seed("people", "Mann", "der", "die Männer", "راجل", "man", "Der Mann arbeitet hier.", "الراجل بيشتغل هنا."),
  seed("people", "Frau", "die", "die Frauen", "ست", "woman", "Die Frau liest ein Buch.", "الست بتقرأ كتاب."),
  seed("people", "Kind", "das", "die Kinder", "طفل", "child", "Das Kind spielt im Garten.", "الطفل بيلعب في الجنينة."),
  seed("people", "Familie", "die", "die Familien", "عيلة", "family", "Meine Familie wohnt in Kairo.", "عيلتي عايشة في القاهرة."),
  seed("people", "Mutter", "die", "die Mütter", "أم", "mother", "Meine Mutter kocht gut.", "أمي بتطبخ حلو."),
  seed("people", "Vater", "der", "die Väter", "أب", "father", "Mein Vater arbeitet viel.", "أبويا بيشتغل كتير."),
  seed("people", "Bruder", "der", "die Brüder", "أخ", "brother", "Mein Bruder ist zehn Jahre alt.", "أخويا عنده عشر سنين."),
  seed("people", "Schwester", "die", "die Schwestern", "أخت", "sister", "Meine Schwester lernt Deutsch.", "أختي بتتعلم ألماني."),
  seed("people", "Freund", "der", "die Freunde", "صاحب", "friend (male)", "Mein Freund kommt aus Berlin.", "صاحبي من برلين."),
  seed("people", "Freundin", "die", "die Freundinnen", "صاحبة", "friend (female)", "Meine Freundin wohnt hier.", "صاحبتي عايشة هنا."),
  seed("people", "Nachbar", "der", "die Nachbarn", "جار", "neighbour", "Der Nachbar ist sehr freundlich.", "الجار ودود جدًا."),
  seed("people", "Kollege", "der", "die Kollegen", "زميل شغل", "colleague", "Mein Kollege hilft mir.", "زميلي بيساعدني."),
  seed("people", "Baby", "das", "die Babys", "بيبي", "baby", "Das Baby schläft.", "البيبي نايم."),
  seed("people", "Großmutter", "die", "die Großmütter", "ست الكل / جدة", "grandmother", "Meine Großmutter kommt morgen.", "جدتي جاية بكرة."),
  seed("people", "Onkel", "der", "die Onkel", "عمو / خال", "uncle", "Mein Onkel hat ein Auto.", "عمي عنده عربية."),

  // ── Food & café ──────────────────────────────────────────────────
  seed("food", "Apfel", "der", "die Äpfel", "تفاحة", "apple", "Ich esse einen Apfel.", "أنا بأكل تفاحة."),
  seed("food", "Banane", "die", "die Bananen", "موزة", "banana", "Die Banane ist gelb.", "الموزة صفرا."),
  seed("food", "Brot", "das", "die Brote", "عيش", "bread", "Das Brot ist frisch.", "العيش طازة."),
  seed("food", "Käse", "der", "die Käse", "جبنة", "cheese", "Der Käse schmeckt gut.", "الجبنة طعمها حلو."),
  seed("food", "Milch", "die", null, "لبن", "milk", "Ich trinke Milch zum Frühstück.", "أنا بأشرب لبن في الفطار."),
  seed("food", "Ei", "das", "die Eier", "بيضة", "egg", "Ich möchte ein Ei.", "عايز بيضة."),
  seed("food", "Kartoffel", "die", "die Kartoffeln", "بطاطس", "potato", "Die Kartoffel ist heiß.", "البطاطس سخنة."),
  seed("food", "Tomate", "die", "die Tomaten", "طماطم", "tomato", "Die Tomate ist rot.", "الطماطم حمرا."),
  seed("food", "Suppe", "die", "die Suppen", "شوربة", "soup", "Die Suppe ist lecker.", "الشوربة لذيذة."),
  seed("food", "Kuchen", "der", "die Kuchen", "كيك", "cake", "Der Kuchen ist süß.", "الكيك حلو."),
  seed("food", "Kaffee", "der", "die Kaffees", "قهوة", "coffee", "Ich trinke jeden Morgen Kaffee.", "أنا بأشرب قهوة كل صباح."),
  seed("food", "Tee", "der", "die Tees", "شاي", "tea", "Der Tee ist heiß.", "الشاي سخن."),
  seed("food", "Wasser", "das", null, "مياه", "water", "Das Wasser ist kalt.", "المياه ساقعة."),
  seed("food", "Rechnung", "die", "die Rechnungen", "فاتورة", "bill", "Die Rechnung ist neun Euro.", "الفاتورة بتسعة يورو."),
  seed("food", "Tasse", "die", "die Tassen", "فنجان", "cup", "Die Tasse steht auf dem Tisch.", "الفنجان على الطاولة."),

  // ── City & transport ─────────────────────────────────────────────
  seed("city", "Bahnhof", "der", "die Bahnhöfe", "محطة قطار", "train station", "Der Bahnhof ist nicht weit.", "المحطة مش بعيدة."),
  seed("city", "Zug", "der", "die Züge", "قطر", "train", "Der Zug kommt um acht.", "القطر بييجي الساعة تمانية."),
  seed("city", "Bus", "der", "die Busse", "أتوبيس", "bus", "Ich fahre mit dem Bus.", "أنا براكب الأتوبيس."),
  seed("city", "Straße", "die", "die Straßen", "شارع", "street", "Die Straße ist ruhig.", "الشارع هادي."),
  seed("city", "Stadt", "die", "die Städte", "مدينة", "city", "Berlin ist eine große Stadt.", "برلين مدينة كبيرة."),
  seed("city", "Platz", "der", "die Plätze", "ميدان / مكان", "square / place", "Der Platz ist voll.", "الميدان زحمة."),
  seed("city", "Apotheke", "die", "die Apotheken", "صيدلية", "pharmacy", "Die Apotheke ist heute offen.", "الصيدلية فاتحة النهارده."),
  seed("city", "Supermarkt", "der", "die Supermärkte", "سوبر ماركت", "supermarket", "Ich gehe in den Supermarkt.", "أنا رايح السوبر ماركت."),
  seed("city", "Bank", "die", "die Banken", "بنك", "bank", "Die Bank ist am Montag geschlossen.", "البنك مقفول يوم الاتنين."),
  seed("city", "Krankenhaus", "das", "die Krankenhäuser", "مستشفى", "hospital", "Das Krankenhaus ist groß.", "المستشفى كبيرة."),
  seed("city", "Schule", "die", "die Schulen", "مدرسة", "school", "Die Schule beginnt um acht.", "المدرسة بتبدأ الساعة تمانية."),
  seed("city", "Park", "der", "die Parks", "حديقة عامة", "park", "Wir gehen in den Park.", "إحنا رايحين الحديقة."),
  seed("city", "Brücke", "die", "die Brücken", "كوبري", "bridge", "Die Brücke ist alt.", "الكوبري قديم."),
  seed("city", "Flughafen", "der", "die Flughäfen", "مطار", "airport", "Der Flughafen ist weit weg.", "المطار بعيد."),
  seed("city", "Fahrkarte", "die", "die Fahrkarten", "تذكرة", "ticket", "Ich kaufe eine Fahrkarte.", "أنا بشتري تذكرة."),

  // ── Work & study ─────────────────────────────────────────────────
  seed("work", "Arbeit", "die", "die Arbeiten", "شغل", "work", "Die Arbeit beginnt um neun.", "الشغل بيبدأ الساعة تسعة."),
  seed("work", "Büro", "das", "die Büros", "مكتب", "office", "Das Büro ist klein.", "المكتب صغير."),
  seed("work", "Chef", "der", "die Chefs", "مدير", "boss", "Der Chef ist im Urlaub.", "المدير في أجازة."),
  seed("work", "Termin", "der", "die Termine", "ميعاد", "appointment", "Ich habe morgen einen Termin.", "عندي ميعاد بكرة."),
  seed("work", "Bewerbung", "die", "die Bewerbungen", "طلب وظيفة", "job application", "Die Bewerbung ist fertig.", "طلب الوظيفة جاهز."),
  seed("work", "Lebenslauf", "der", "die Lebensläufe", "سيرة ذاتية", "CV / résumé", "Er schickt seinen Lebenslauf.", "هو بيبعت السيرة الذاتية بتاعته."),
  seed("work", "Firma", "die", "die Firmen", "شركة", "company", "Die Firma ist groß.", "الشركة كبيرة."),
  seed("work", "Gehalt", "das", "die Gehälter", "مرتب", "salary", "Das Gehalt ist gut.", "المرتب كويس."),
  seed("work", "Kurs", "der", "die Kurse", "كورس", "course", "Der Kurs beginnt am Montag.", "الكورس بيبدأ يوم الاتنين."),
  seed("work", "Lehrer", "der", "die Lehrer", "مدرّس", "teacher", "Der Lehrer erklärt die Grammatik.", "المدرّس بيشرح القواعد."),
  seed("work", "Lehrerin", "die", "die Lehrerinnen", "مدرّسة", "teacher (female)", "Die Lehrerin ist nett.", "المدرّسة لطيفة."),
  seed("work", "Universität", "die", "die Universitäten", "جامعة", "university", "Die Universität ist alt.", "الجامعة قديمة."),
  seed("work", "Prüfung", "die", "die Prüfungen", "امتحان", "exam", "Die Prüfung war schwer.", "الامتحان كان صعب."),
  seed("work", "Frage", "die", "die Fragen", "سؤال", "question", "Ich habe eine Frage.", "عندي سؤال."),
  seed("work", "Antwort", "die", "die Antworten", "إجابة", "answer", "Die Antwort ist richtig.", "الإجابة صح."),

  // ── Body & health ────────────────────────────────────────────────
  seed("health", "Kopf", "der", "die Köpfe", "راس", "head", "Mein Kopf tut weh.", "دماغي بتوجعني."),
  seed("health", "Bauch", "der", "die Bäuche", "بطن", "stomach / belly", "Der Bauch tut weh.", "بطني بتوجعني."),
  seed("health", "Hand", "die", "die Hände", "إيد", "hand", "Ich wasche meine Hand.", "أنا بغسل إيدي."),
  seed("health", "Auge", "das", "die Augen", "عين", "eye", "Mein Auge ist müde.", "عيني تعبانة."),
  seed("health", "Rücken", "der", "die Rücken", "ضهر", "back", "Mein Rücken tut weh.", "ضهري بيوجعني."),
  seed("health", "Fieber", "das", null, "سخونية", "fever", "Ich habe Fieber.", "عندي سخونية."),
  seed("health", "Medikament", "das", "die Medikamente", "دوا", "medicine", "Das Medikament hilft.", "الدوا بيساعد."),
  seed("health", "Arzt", "der", "die Ärzte", "دكتور", "doctor", "Der Arzt ist nett.", "الدكتور لطيف."),
  seed("health", "Ärztin", "die", "die Ärztinnen", "دكتورة", "doctor (female)", "Die Ärztin hat Zeit.", "الدكتورة عندها وقت."),
  seed("health", "Schmerz", "der", "die Schmerzen", "ألم", "pain", "Der Schmerz ist stark.", "الألم قوي."),

  // ── Shopping & clothes ───────────────────────────────────────────
  seed("shopping", "Geschäft", "das", "die Geschäfte", "محل", "shop", "Das Geschäft ist offen.", "المحل فاتح."),
  seed("shopping", "Kleidung", "die", null, "هدوم", "clothing", "Die Kleidung ist günstig.", "الهدوم رخيصة."),
  seed("shopping", "Hemd", "das", "die Hemden", "قميص", "shirt", "Das Hemd ist blau.", "القميص أزرق."),
  seed("shopping", "Hose", "die", "die Hosen", "بنطلون", "trousers", "Die Hose ist zu lang.", "البنطلون طويل أوي."),
  seed("shopping", "Schuh", "der", "die Schuhe", "جزمة", "shoe", "Der Schuh ist neu.", "الجزمة جديدة."),
  seed("shopping", "Jacke", "die", "die Jacken", "جاكيت", "jacket", "Die Jacke ist warm.", "الجاكيت دافي."),
  seed("shopping", "Größe", "die", "die Größen", "مقاس", "size", "Diese Größe ist zu klein.", "المقاس ده صغير أوي."),
  seed("shopping", "Preis", "der", "die Preise", "سعر", "price", "Der Preis ist gut.", "السعر كويس."),
  seed("shopping", "Portemonnaie", "das", "die Portemonnaies", "محفظة", "wallet", "Mein Portemonnaie ist weg.", "محفظتي ضاعت."),
  seed("shopping", "Farbe", "die", "die Farben", "لون", "colour", "Die Farbe ist schön.", "اللون حلو."),
];

if (import.meta.env.DEV && STARTER_VOCAB.length !== 100) {
  console.warn(`Expected 100 starter vocabulary cards, found ${STARTER_VOCAB.length}.`);
}
