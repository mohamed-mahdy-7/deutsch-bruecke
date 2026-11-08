import { STARTER_VOCAB } from "@/data/vocabulary";
import type { GrammarArticle } from "@/types/domain";

const EXTRA_NOUNS: Record<string, GrammarArticle> = {
  getränk: "das",
  speisekarte: "die",
  toilette: "die",
  praxis: "die",
  schmerz: "der",
  husten: "der",
  schnupfen: "der",
  allergie: "die",
  rezept: "das",
  erfahrung: "die",
  stärke: "die",
  team: "das",
  projekt: "das",
  vertrag: "der",
  dokument: "das",
  pass: "der",
  ausweis: "der",
  formular: "das",
  unterschrift: "die",
  anmeldung: "die",
  bürgeramt: "das",
  umkleidekabine: "die",
  bestätigung: "die",
  wohnungsgeberbestätigung: "die",
  bewerbung: "die",
  firmenchef: "der",
  aufgabe: "die",
  lösung: "die",
  beispiel: "das",
  sprache: "die",
  wort: "das",
  satz: "der",
  fehler: "der",
  übung: "die",
  stunde: "die",
  minute: "die",
  woche: "die",
  monat: "der",
  jahr: "das",
  tag: "der",
  morgen: "der",
  abend: "der",
  nacht: "die",
  freundlichkeit: "die",
  lächeln: "das",
  hilfe: "die",
};

export const NOUN_GENDERS: ReadonlyMap<string, GrammarArticle> = new Map([
  ...STARTER_VOCAB.flatMap((card) =>
    card.article ? [[card.word.toLowerCase(), card.article] as const] : [],
  ),
  ...Object.entries(EXTRA_NOUNS),
]);

const DEFINITE_FALLBACK: Record<string, GrammarArticle> = {
  der: "der",
  den: "der",
  dem: "der",
  des: "der",
  die: "die",
  das: "das",
};

const INDEFINITE_FORMS = new Set([
  "ein",
  "eine",
  "einen",
  "einem",
  "einer",
  "eines",
]);

/**
 * A hand-curated high-frequency verb form list. Combined with common
 * lowercase infinitives below, this gives useful verb highlighting without
 * pulling a full morphological engine into the client bundle.
 */
const VERB_FORMS = new Set(
  `
  bin bist ist sind seid war waren gewesen sei seien
  habe hast hat haben habt hatte hatten gehabt
  werde wirst wird werden werdet wurde wurden geworden
  kann kannst können könnt konnte konnten gekonnt
  will willst wollen wollt wollte wollten
  muss musst müssen müsst musste mussten
  darf darfst dürfen dürft durfte durften
  soll sollst sollen sollt sollte sollten
  mag magst mögen mögt mochte mochten
  möchte möchtest möchten möchtet
  gehe gehst geht gehen ging gingen gegangen
  komme kommst kommt kommen kam kamen gekommen
  wohne wohnst wohnt wohnen wohnte wohnten gewohnt
  heiße heißt heißen hieß hießen geheißen
  arbeite arbeitest arbeitet arbeiten arbeitete arbeiteten gearbeitet
  mache machst macht machen machte machten gemacht
  kaufe kaufst kauft kaufen kaufte kauften gekauft
  lese liest lesen lest las lasen gelesen
  esse isst esst essen aß aßen gegessen
  trinke trinkst trinkt trinken trank tranken getrunken
  fahre fährst fährt fahren fahrt fuhr fuhren gefahren
  fliege fliegst fliegt fliegen flog flogen geflogen
  spreche sprichst spricht sprechen sprecht sprach sprachen gesprochen
  verstehe verstehst versteht verstehen verstand verstanden
  denke denkst denkt denken dachte dachten gedacht
  finde findest findet finden fand fanden gefunden
  gebe gibst gibt geben gebt gab gaben gegeben
  nehme nimmst nimmt nehmen nehmt nahm nahmen genommen
  sehe siehst sieht sehen seht sah sahen gesehen
  schlafe schläfst schläft schlafen schlief schliefen geschlafen
  helfe hilfst hilft helfen helft half halfen geholfen
  brauche brauchst braucht brauchen brauchte gebraucht
  spiele spielst spielt spielen spielte gespielt
  lerne lernst lernt lernen lernte gelernt
  warte wartest wartet warten wartete gewartet
  bleibe bleibst bleibt bleiben blieb blieben geblieben
  rufe rufst ruft rufen rief riefen gerufen
  besuche besuchst besucht besuchen besuchte besucht
  bezahle bezahlst bezahlt bezahlen bezahlte bezahlt
  bestelle bestellst bestellt bestellen bestellte bestellt
  öffne öffnest öffnet öffnen öffnete geöffnet
  schließe schließt schließen schloss geschlossen
  vergesse vergisst vergessen vergaß vergessen
  treffe triffst trifft treffen traf getroffen
  schreibe schreibst schreibt schreiben schrieb geschrieben
  höre hörst hört hören hörte gehört
  fühle fühlst fühlt fühlen fühlte gefühlt
  fehle fehlt fehlen fehlte gefehlt
  tut tust tun tat getan
  gibt
  aufstehen stehe auf aufgestanden
  anrufen rufe an angerufen
  einkaufen kaufe ein eingekauft
  mitbringen bringe mit mitgebracht
  zurückkommen komme zurück zurückgekommen
  einladen lade ein eingeladen
  anfangen fange an angefangen
  aufhören höre auf aufgehört
  abholen hole ab abgeholt
  vorbereiten bereite vor vorbereitet
  entscheiden entscheide entschieden
  verstehen verstanden
  gefallen gefällt gefallen
  passen passt gepasst
  wehtun weh getan
  bewerben bewirbt beworben
  empfehlen empfiehlt empfohlen
  bezahlen
  drauf
  `.trim().split(/\s+/),
);

const NON_VERB_ENDINGS = new Set([
  "offen",
  "eben",
  "neben",
  "oben",
  "unten",
  "außen",
  "innen",
  "zwischen",
  "gegen",
  "wegen",
  "während",
  "morgen",
  "gerne",
  "oben",
  "eigen",
  "klein",
  "allein",
  "gemein",
  "bein",
  "sein",
  "schein",
  "wein",
  "stein",
]);

const WORD_PATTERN = /[\p{L}\p{M}]+(?:[’'’-][\p{L}\p{M}]+)*/gu;
const WORD_TEST = new RegExp(`^${WORD_PATTERN.source}$`, "u");

export interface GermanSegment {
  value: string;
  isWord: boolean;
  className?: string;
}

function linguisticallyClean(word: string): string {
  return word.toLowerCase().replace(/[’']/g, "'");
}

/**
 * Classify a single word using the next word for article/noun agreement when
 * available. Unknown nouns gracefully fall back to the article's base shape.
 */
export function classifyGermanWord(word: string, nextWord?: string): string | undefined {
  const lower = linguisticallyClean(word);
  const nextGender = nextWord
    ? NOUN_GENDERS.get(linguisticallyClean(nextWord))
    : undefined;

  if (lower in DEFINITE_FALLBACK) {
    const gender = nextGender ?? DEFINITE_FALLBACK[lower];
    return gender === "der"
      ? "grammar-der"
      : gender === "die"
        ? "grammar-die"
        : "grammar-das";
  }

  if (INDEFINITE_FORMS.has(lower)) {
    if (!nextGender) return undefined;
    return nextGender === "der"
      ? "grammar-der"
      : nextGender === "die"
        ? "grammar-die"
        : "grammar-das";
  }

  if (VERB_FORMS.has(lower)) {
    return "grammar-verb";
  }

  // Lowercase common infinitives are highly likely verbs. We exclude a small
  // list of common non-verbs ending in -en.
  if (
    lower.endsWith("en") &&
    lower === lower.toLowerCase() &&
    word[0] === word[0]?.toLowerCase() &&
    !NON_VERB_ENDINGS.has(lower) &&
    !NOUN_GENDERS.has(lower)
  ) {
    return "grammar-verb";
  }

  return undefined;
}

/** Split German text into words and the punctuation/whitespace between them. */
export function segmentGermanText(text: string): GermanSegment[] {
  const splitter = new RegExp(`(${WORD_PATTERN.source})`, "u");
  const values = text.split(splitter);
  const wordIndexes = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value.length > 0 && WORD_TEST.test(entry.value));

  return values.map((value, index) => {
    const isWord = value.length > 0 && WORD_TEST.test(value);
    if (!isWord) return { value, isWord: false };
    const entryPosition = wordIndexes.findIndex((entry) => entry.index === index);
    const nextWord =
      entryPosition >= 0 ? wordIndexes[entryPosition + 1]?.value : undefined;
    return {
      value,
      isWord: true,
      className: classifyGermanWord(value, nextWord),
    };
  });
}
